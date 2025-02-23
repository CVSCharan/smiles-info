import React, { useState, useEffect } from "react";
import "./App.css";

const App = () => {
  const [smiles, setSmiles] = useState("");
  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [rdkit, setRdkit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRDKit = async () => {
      try {
        const RDKitModule = await window.initRDKitModule();
        setRdkit(RDKitModule);
      } catch (error) {
        console.error("RDKit.js failed to load:", error);
      }
    };

    if (!window.RDKit) {
      loadRDKit();
    } else {
      setRdkit(window.RDKit);
    }
  }, []);

  const checkRules = (mol) => {
    if (!mol) return null;

    let passed = { lipinski: [], veber: [], ghose: [], egan: [] };
    let failed = { lipinski: [], veber: [], ghose: [], egan: [] };

    try {
      // Compute descriptors
      const properties = JSON.parse(mol.get_descriptors());

      // Handle missing values properly
      const molWeight = properties.MolWt || 0;
      const numHDonors = properties.NumHDonors || 0;
      const numHAcceptors = properties.NumHAcceptors || 0;
      const logP = properties.MolLogP || 0;
      const numRotBonds = properties.NumRotatableBonds || 0;
      const tpsa = properties.TPSA || 0;

      console.log("Molecular Properties:", properties);

      // Lipinski Rule of 5
      numHDonors > 5
        ? failed.lipinski.push(`Too many H-bond donors: ${numHDonors}`)
        : passed.lipinski.push(`H-bond donors: ${numHDonors}`);

      numHAcceptors > 10
        ? failed.lipinski.push(`Too many H-bond acceptors: ${numHAcceptors}`)
        : passed.lipinski.push(`H-bond acceptors: ${numHAcceptors}`);

      molWeight >= 500
        ? failed.lipinski.push(`Molecular weight too high: ${molWeight}`)
        : passed.lipinski.push(`Molecular weight: ${molWeight}`);

      logP >= 5
        ? failed.lipinski.push(`LogP too high: ${logP}`)
        : passed.lipinski.push(`LogP: ${logP}`);

      // Veber Rule
      numRotBonds > 10
        ? failed.veber.push(`Too many rotatable bonds: ${numRotBonds}`)
        : passed.veber.push(`Rotatable bonds: ${numRotBonds}`);

      tpsa > 140
        ? failed.veber.push(`TPSA too high: ${tpsa}`)
        : passed.veber.push(`TPSA: ${tpsa}`);

      // Ghose Filter
      if (molWeight < 160 || molWeight > 480)
        failed.ghose.push(`MW out of range: ${molWeight}`);
      else passed.ghose.push(`MW: ${molWeight}`);

      if (logP < -0.4 || logP > 5.6)
        failed.ghose.push(`LogP out of range: ${logP}`);
      else passed.ghose.push(`LogP: ${logP}`);

      numRotBonds > 15
        ? failed.ghose.push(`Too many rotatable bonds: ${numRotBonds}`)
        : passed.ghose.push(`Rotatable bonds: ${numRotBonds}`);

      // Egan Rule
      if (molWeight < 130 || molWeight > 500)
        failed.egan.push(`MW out of range: ${molWeight}`);
      else passed.egan.push(`MW: ${molWeight}`);

      if (logP < -1 || logP > 5) failed.egan.push(`LogP out of range: ${logP}`);
      else passed.egan.push(`LogP: ${logP}`);

      if (tpsa < 20 || tpsa > 150)
        failed.egan.push(`TPSA out of range: ${tpsa}`);
      else passed.egan.push(`TPSA: ${tpsa}`);

      return { passed, failed };
    } catch (error) {
      console.error("Error in checking rules:", error);
      return null;
    }
  };

  const handleSubmit = () => {
    setError("");
    if (!smiles || !rdkit) {
      setError("Please enter a valid SMILES string.");
      return;
    }

    try {
      const mol = rdkit.get_mol(smiles);
      setImage(mol.get_svg());
      const results = checkRules(mol);
      setResults(results);
    } catch (error) {
      setError("Invalid SMILES format. Please try again.");
    }
  };

  return (
    <main className="main-body">
      <div className="container">
        <h1>SMILES Checker</h1>
        <h2>
          Enter a SMILES string to check Lipinski, Veber, Ghose, and Egan rules.
        </h2>
        <div className="input-container">
          <input
            type="text"
            value={smiles}
            onChange={(e) => setSmiles(e.target.value)}
            placeholder="Enter SMILES string (e.g., C1CCCCC1)"
          />
          <button onClick={handleSubmit} disabled={!rdkit}>
            {rdkit ? "Check Rules" : "Loading RDKit ..."}
          </button>

          {error && <p className="error">{error}</p>}
        </div>

        {image && (
          <div
            className="image-container"
            dangerouslySetInnerHTML={{ __html: image }}
          />
        )}

        {/* Display rule-wise cards */}
        {results && (
          <div className="card-container">
            <h2>Analysis</h2>

            <div className="card-inner-container">
              {Object.keys(results.passed).map((rule) => (
                <div key={rule} className="card">
                  <h3 style={{ margin: "0.5rem 0" }}>{rule.toUpperCase()}</h3>
                  {results.passed[rule].length > 0 && (
                    <p className="passed">
                      {results.passed[rule].length > 0
                        ? results.passed[rule].join(", ")
                        : "None"}
                    </p>
                  )}
                  {results.failed[rule].length > 0 && (
                    <p className="failed">
                      {results.failed[rule].length > 0
                        ? results.failed[rule].join(", ")
                        : "None"}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Final Conclusion Card */}
            {/* <div className="conclusion">
              <h2>Final Conclusion</h2>

              {Object.values(results.failed).flat().length === 0 ? (
                <p className="passed">
                  ✅ This molecule meets all drug-likeness criteria and is a
                  strong drug candidate!
                </p>
              ) : (
                <>
                  <p className="warning">
                    ⚠ This molecule violates the following drug-likeness rules:
                  </p>
                  <ul>
                    {Object.keys(results.failed).map(
                      (rule) =>
                        results.failed[rule].length > 0 && (
                          <li key={rule} className="failed">
                            ❌ {rule.toUpperCase()}
                          </li>
                        )
                    )}
                  </ul>
                  <p className="failed">
                    ❗ This molecule may require further optimization for drug
                    development.
                  </p>
                </>
              )}
            </div> */}
          </div>
        )}
      </div>
    </main>
  );
};

export default App;
