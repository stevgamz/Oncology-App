import React, { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./Firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createPatient, readOrganization, readPatient } from "./FhirService";
import CryptoJS from "crypto-js";
import "./index.css";

interface Patient {
  telecom: Array<{
    system: string;
    value: string;
  }>;
  resourceType: string;
  id?: string;
  meta?: {
    profile: Array<string>;
  };
  text?: {
    status: string;
    div: string;
  };
  identifier?: Array<{
    use: string;
    type: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    system: string;
    value: string;
  }>;
  active?: boolean;
  name: Array<{
    use: string;
    family: string;
    given: Array<string>;
  }>;
  gender?: string;
  birthDate?: string;
  communication?: Array<{
    language: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
  }>;
  managingOrganization?: {
    reference: string;
  };
  address?: Array<{
    // use?: string;
    // type?: string;
    // text?: string;
    // line: Array<string>;
    // city: string;
    // state: string;
    // postalCode: string;
    country: string;
  }>;
}

interface PatientErrors {
  name?: string;
  family?: string;
  gender?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  patientGuardianName?: string;
  patientGuardianPhone?: string;
}

// interface PatientDataProps {
//   id: string;
//   name?: Array<{
//     family: string;
//     given: Array<string>;
//   }>;
//   gender: string;
//   birthDate: string;
//   telecom?: Array<{
//     system: string;
//     value: string;
//   }>;
// }

interface HashMapping {
  names: {
    family: { [hash: string]: string };
    given: { [hash: string]: string };
  };
  telecom: { [hash: string]: string };
}

interface PatientToken {
  token: string;
  patientId: string;
  createdAt: Date;
}

const PatientForm: React.FC = () => {
  const fetchPatientData = async () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const phrDoc = await getDoc(doc(db, "PHR", user.uid));
          const phrId = phrDoc.data()?.phrId;
          if (phrId) {
            const PatientDoc = await getDoc(doc(db, "Patient", phrId));
            const fhirId = PatientDoc.data()?.fhirId;

            let patients;
            if (fhirId) {
              const mappingDoc = await getDoc(doc(db, "HashMappings", fhirId));
              const storedMapping = mappingDoc.data()?.mapping;
              patients = await readPatient(fhirId, storedMapping);
            } else {
              patients = PatientDoc.data();
            }
            setName(patients.name[0].given[0]);
            setFamily(patients.name[0].family);
            setGender(patients.gender);
            setPhone(
              patients.telecom.find(
                (t: { system: string }) => t.system === "phone"
              )?.value || ""
            );
            setEmail(
              patients.telecom.find(
                (t: { system: string }) => t.system === "email"
              )?.value || ""
            );
            setBirthDate(
              new Date(patients.birthDate).toISOString().split("T")[0]
            );
          } else {
            console.error("PHR ID does not exist in the database");
          }
        } catch (error) {
          console.error("Error fetching data", error);
        }
      }
    });
  };

  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [JsonResult, setJsonResult] = useState<Patient | null>(null);

  const [name, setName] = useState<string>("");
  const [family, setFamily] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [addressLine, setAddressLine] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [managingOrganization, setManagingOrganization] = useState<string>("");
  const [errors, setErrors] = useState<PatientErrors>({});
  const [hashMapping, setHashMapping] = useState<HashMapping>({
    names: {
      family: {},
      given: {},
    },
    telecom: {},
  });

  hashMapping;

  const [patientToken, setPatientToken] = useState<string>("");
  patientToken;
  // const [inputToken, setInputToken] = useState<string>("");
  // const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  // const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  const generateRandomToken = (): string => {
    const tokenLength = 8;
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "";

    for (let i = 0; i < tokenLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      token += characters[randomIndex];
    }

    return token;
  };

  const saveTokenToDatabase = async (
    _userId: string,
    patientId: string,
    token: string
  ) => {
    try {
      const tokenData: PatientToken = {
        token: token,
        patientId: patientId,
        createdAt: new Date(),
      };
      await setDoc(doc(db, "PatientTokens", patientId), tokenData);
    } catch (error) {
      console.error("Error saving token:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (patient) {
      setName(patient?.name?.[0]?.given?.[0] || "");
      setFamily(patient?.name?.[0]?.family || "");
      setGender(patient?.gender || "");
      setBirthDate(patient?.birthDate || "");
      setPhone(
        patient?.telecom?.find((t) => t.system === "phone")?.value || ""
      );
      setEmail(
        patient?.telecom?.find((t) => t.system === "email")?.value || ""
      );
      // setAddressLine(patient?.address?.[0]?.line?.[0] || "");
      // setCity(patient?.address?.[0]?.city || "");
      // setState(patient?.address?.[0]?.state || "");
      // setPostalCode(patient?.address?.[0]?.postalCode || "");
      // setCountry(patient?.address?.[0]?.country || "");
      setManagingOrganization(patient?.managingOrganization?.reference || "");
    }
    fetchPatientData();
  }, [patient]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    setErrors({});

    const newErrors: PatientErrors = {};
    if (!name) newErrors.name = "First name is required";
    if (!family) newErrors.family = "Last name is required";
    if (!gender) newErrors.gender = "Gender is required";
    if (!birthDate) newErrors.birthDate = "Birth date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let generatedId = "";
    if (country === "Indonesia") {
      generatedId =
        "ID" +
        Math.random().toString(36).substr(2, 3) +
        Math.floor(1000 + Math.random() * 9000);
    } else if (country === "America") {
      generatedId =
        "US" +
        Math.random().toString(36).substr(2, 3) +
        Math.floor(1000 + Math.random() * 9000);
    } else if (country === "Taiwan") {
      generatedId =
        "TW" +
        Math.random().toString(36).substr(2, 3) +
        Math.floor(1000 + Math.random() * 9000);
    }

    const newHashMapping = {
      names: {
        family: {
          [CryptoJS.SHA256(family).toString()]: family,
        },
        given: {
          [CryptoJS.SHA256(name).toString()]: name,
        },
      },
      telecom: {
        [CryptoJS.SHA256(phone).toString()]: phone,
        [CryptoJS.SHA256(email).toString()]: email,
      },
    };

    const patientStructure: Patient = {
      resourceType: "Patient",
      meta: {
        profile: [
          // "https://hapi.fhir.tw/fhir/StructureDefinition/MITW-T1-SC2-PatientIdentification",
          "https://hapi.fhir.tw/fhir/StructureDefinition/TWCorePatient",
        ],
      },
      text: {
        status: "generated",
        div: `<div xmlns="http://www.w3.org/1999/xhtml">
          Patient: ${CryptoJS.SHA256(name).toString() ?? ""} ${
          CryptoJS.SHA256(family).toString() ?? ""
        }
          Gender: ${gender ?? ""}
          DOB: ${birthDate ?? ""}
        </div>`,
      },
      identifier: [
        {
          use: "official",
          type: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                code: "MR",
                display: "Medical record number",
              },
            ],
          },
          system: "http://hospital.smarthealth.org/identifiers/patients",
          value: "12345",
        },
      ],
      active: true,
      name: [
        {
          use: "official",
          family: family,
          given: [name],
        },
      ],
      gender: gender,
      birthDate: birthDate,
      communication: [
        {
          language: {
            coding: [
              {
                system: "urn:ietf:bcp:47",
                code: "zh-TW",
                display: "Chinese (Taiwan)",
              },
            ],
          },
        },
      ],
      managingOrganization: {
        reference: `Organization/${await readOrganization(
          managingOrganization
        )}`,
      },
      telecom: [
        {
          system: "phone",
          value: phone,
        },
        {
          system: "email",
          value: email,
        },
      ],
      address: [
        {
          // use: "home",
          // type: "both",
          // text: addressLine,
          // line: [addressLine],
          // city: city,
          // state: state,
          // postalCode: postalCode,
          country: country,
        },
      ],
    };

    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const phrDocRef = doc(db, "PHR", user.uid);
          const phrDoc = await getDoc(phrDocRef);
          const phrId = phrDoc.data()?.phrId;
          phrId ?? console.error("PHR ID not found");
          const patientDocRef = doc(db, "Patient", phrId);
          const patientDoc = await getDoc(patientDocRef);

          const existingObservations =
            patientDoc.data()?.observations?.url || "";

          const newPatient: Patient = patientStructure;
          newPatient.id = phrDoc.data()?.fhirId || generatedId;

          const newToken = generateRandomToken();
          setPatientToken(newToken);
          console.log(newToken);

          const { patient: savedPatient, hashMapping } = await createPatient(
            newPatient,
            true
          );

          await saveTokenToDatabase(user.uid, savedPatient.id, newToken);
          setHashMapping(newHashMapping);

          if (hashMapping) {
            const mappingDocRef = doc(db, "HashMappings", savedPatient.id);
            await setDoc(mappingDocRef, {
              mapping: hashMapping,
              token: newToken,
            });
          }

          const encryptedPatient = await createPatient(newPatient, true);
          setPatient(encryptedPatient.patient);
          setJsonResult(encryptedPatient.patient);

          await setDoc(phrDocRef, {
            googleId: user.uid,
            phrId: phrId,
            fhirId: savedPatient.id,
          });

          await setDoc(patientDocRef, {
            fhirId: savedPatient.id,
            name: [
              {
                family: savedPatient.name?.[0]?.family || "",
                given: [savedPatient.name?.[0]?.given?.[0] || ""],
              },
            ],
            birthDate: savedPatient.birthDate,
            gender: savedPatient.gender,
            observations: {
              url: existingObservations || "",
            },
            telecom: [
              {
                system: savedPatient.telecom?.[0]?.system || "",
                value: savedPatient.telecom?.[0]?.value || "",
              },
              {
                system: savedPatient.telecom?.[1]?.system || "",
                value: savedPatient.telecom?.[1]?.value || "",
              },
            ],
            country: country,
            managingOrganization: managingOrganization,
          });

          navigate("/phr");
        }
      });
    } catch (error) {
      console.error("Error saving patient:", error);
      alert("Failed to save patient. Please try again.");
    }
  };

  // const verifyToken = async (
  //   patientId: string,
  //   inputToken: string
  // ): Promise<boolean> => {
  //   try {
  //     const tokenDoc = await getDoc(doc(db, "PatientTokens", patientId));
  //     if (tokenDoc.exists()) {
  //       const storedToken = tokenDoc.data().token;
  //       return storedToken === inputToken;
  //     }
  //     return false;
  //   } catch (error) {
  //     console.error("Error verifying token:", error);
  //     return false;
  //   }
  // };

  // const handleReveal = async () => {
  //   if (!JsonResult?.id) {
  //     alert("No patient data to reveal");
  //     return;
  //   }

  //   try {
  //     if (!isTokenValid) {
  //       setShowTokenInput(true);
  //       return;
  //     }
  //     const user = auth.currentUser;
  //     if (!user) {
  //       console.error("No user logged in");
  //       return;
  //     }

  //     const mappingDoc = await getDoc(doc(db, "HashMappings", JsonResult.id));
  //     if (!mappingDoc.exists()) {
  //       console.error("No hash mapping found");
  //       return;
  //     }

  //     const storedMapping = mappingDoc.data().mapping;

  //     const decryptedPatient = await readPatient(JsonResult.id, storedMapping);

  //     setPatient(decryptedPatient);
  //     setJsonResult(decryptedPatient);

  //     setName(decryptedPatient.name?.[0]?.given?.[0] || "");
  //     setFamily(decryptedPatient.name?.[0]?.family || "");
  //     setPhone(
  //       decryptedPatient.telecom?.find(
  //         (t: { system: string }) => t.system === "phone"
  //       )?.value || ""
  //     );
  //     setEmail(
  //       decryptedPatient.telecom?.find(
  //         (t: { system: string }) => t.system === "email"
  //       )?.value || ""
  //     );
  //   } catch (error) {
  //     console.error("Error revealing patient data:", error);
  //     alert("Failed to reveal patient data. Please try again.");
  //   }
  // };

  // const handleTokenSubmit = async () => {
  //   if (!JsonResult?.id) return;

  //   const isValid = await verifyToken(JsonResult.id, inputToken);
  //   if (isValid) {
  //     setIsTokenValid(true);
  //     setShowTokenInput(false);
  //     handleReveal();
  //   } else {
  //     alert("Invalid token. Please try again.");
  //     setInputToken("");
  //   }

  //   const patientDataToPass: PatientDataProps = {
  //     id: JsonResult?.id || "",
  //     name: JsonResult?.name?.[0]?.given?.[0] || "",
  //     family: JsonResult?.name?.[0]?.family || "",
  //     gender: JsonResult?.gender || "",
  //     birthDate: JsonResult?.birthDate || "",
  //   };

  //   navigate("/observation", {
  //     state: {
  //       patientData: patientDataToPass,
  //     },
  //   });
  // };

  // const handleDelete = async (id: string) => {
  //   await deletePatient(id);
  //   setPatient(null);
  // };

  return (
    <div className="bg-gradient-to-r from-green-100 to-blue-100 min-h-screen flex items-center justify-center px-4">
      <div className="absolute top-5 left-5 z-0">
        <button
          onClick={() => navigate("/phr/profile")}
          className=" hover:underline text-xl mb-4 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">
          Patient Details
        </h2>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                First Name:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.name
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.name && (
                <span className="text-red-500 text-sm">{errors.name}</span>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Last Name:
              </label>
              <input
                type="text"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.family
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.family && (
                <span className="text-red-500 text-sm">{errors.family}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Gender:
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.gender
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
              {errors.gender && (
                <span className="text-red-500 text-sm">{errors.gender}</span>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Birth Date:
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.birthDate
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.birthDate && (
                <span className="text-red-500 text-sm">{errors.birthDate}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Phone:
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.phone
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.phone && (
                <span className="text-red-500 text-sm">{errors.phone}</span>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.email
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.email && (
                <span className="text-red-500 text-sm">{errors.email}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Address:
            </label>
            <textarea
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                errors.addressLine
                  ? "border-red-500"
                  : "focus:ring-2 focus:ring-green-500"
              }`}
              // rows="2"
            ></textarea>
            {errors.addressLine && (
              <span className="text-red-500 text-sm">{errors.addressLine}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                City:
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.city
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.city && (
                <span className="text-red-500 text-sm">{errors.city}</span>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                State:
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.state
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.state && (
                <span className="text-red-500 text-sm">{errors.state}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Postal Code:
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.postalCode
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.postalCode && (
                <span className="text-red-500 text-sm">
                  {errors.postalCode}
                </span>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Country:
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  errors.country
                    ? "border-red-500"
                    : "focus:ring-2 focus:ring-green-500"
                }`}
              />
              {errors.country && (
                <span className="text-red-500 text-sm">{errors.country}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Managing Organization:
            </label>
            <input
              type="text"
              value={managingOrganization}
              onChange={(e) => setManagingOrganization(e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                errors.patientGuardianName
                  ? "border-red-500"
                  : "focus:ring-2 focus:ring-green-500"
              }`}
            />
            {errors.patientGuardianName && (
              <span className="text-red-500 text-sm">
                {errors.patientGuardianName}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Save Patient
          </button>
        </form>

        <div className="bg-gray-100 p-6 rounded-lg shadow-inner w-full mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Resulting JSON:
          </h2>
          <pre className="bg-white p-4 rounded-md shadow-sm text-sm text-gray-700 overflow-x-auto">
            {JSON.stringify(JsonResult, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default PatientForm;
