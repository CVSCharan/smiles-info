import React, { useState, useEffect } from "react";
import "./App.css";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const App = () => {
  const [smiles, setSmiles] = useState("");
  const [image, setImage] = useState(null);
  const [results, setResults] = useState(null);
  const [rdkit, setRdkit] = useState(null);
  const [error, setError] = useState("");
  const [loader, setLoader] = useState(false);

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
      const properties = JSON.parse(mol.get_descriptors());
      console.log("Molecular Properties:", properties);

      const molWeight = properties.exactmw || properties.amw || 0;
      const numHDonors = properties.NumHBD || properties.lipinskiHBD || 0;
      const numHAcceptors = properties.NumHBA || properties.lipinskiHBA || 0;
      const logP = properties.CrippenClogP || 0;
      const numRotBonds = properties.NumRotatableBonds || 0;
      const tpsa = properties.tpsa || 0;

      // Lipinski's Rule of Five
      if (numHDonors > 5)
        failed.lipinski.push(`Too many H-bond donors: ${numHDonors}`);
      else passed.lipinski.push(`H-bond donors: ${numHDonors}`);

      if (numHAcceptors > 10)
        failed.lipinski.push(`Too many H-bond acceptors: ${numHAcceptors}`);
      else passed.lipinski.push(`H-bond acceptors: ${numHAcceptors}`);

      if (molWeight > 500)
        failed.lipinski.push(`Molecular weight too high: ${molWeight}`);
      else passed.lipinski.push(`Molecular weight: ${molWeight}`);

      if (logP > 5) failed.lipinski.push(`LogP too high: ${logP}`);
      else passed.lipinski.push(`LogP: ${logP}`);

      // Veber's Rule
      if (numRotBonds > 10)
        failed.veber.push(`Too many rotatable bonds: ${numRotBonds}`);
      else passed.veber.push(`Rotatable bonds: ${numRotBonds}`);

      if (tpsa > 140) failed.veber.push(`TPSA too high: ${tpsa}`);
      else passed.veber.push(`TPSA: ${tpsa}`);

      // Ghose's Rule (MW should be 160-480)
      if (molWeight < 160 || molWeight > 480)
        failed.ghose.push(`MW out of range: ${molWeight}`);
      else passed.ghose.push(`MW: ${molWeight}`);

      if (logP < -0.4 || logP > 5.6)
        failed.ghose.push(`LogP out of range: ${logP}`);
      else passed.ghose.push(`LogP: ${logP}`);

      if (numRotBonds > 15)
        failed.ghose.push(`Too many rotatable bonds: ${numRotBonds}`);
      else passed.ghose.push(`Rotatable bonds: ${numRotBonds}`);

      // Egan's Rule (MW should be 130-500, TPSA should be 20-150)
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

    setLoader(true); // Show loader

    try {
      const mol = rdkit.get_mol(smiles);
      setImage(mol.get_svg());
      setTimeout(() => {
        const results = checkRules(mol);
        setResults(results);
        setLoader(false); // Hide loader after 2 seconds
      }, 2000);
      setResults(results);
    } catch (error) {
      setError("Invalid SMILES format. Please try again.");
    }
  };

  const handleClearSearch = () => {
    setSmiles("");
  };

  return (
    <main className="main-body">
      <section className="main-section">
        <div className="container">
          <h1 className="main-heading">SMILES Checker</h1>
          <h2 className="heading">
            Input a SMILES string to analyze its compliance with Lipinski,
            Veber, Ghose, and Egan rules.
          </h2>
          <div className="input-container">
            <div className="input-inner-container">
              <input
                type="text"
                value={smiles}
                onChange={(e) => setSmiles(e.target.value)}
                placeholder="Enter SMILES string (e.g., C1CCCCC1)"
              />
              {smiles && (
                <CancelOutlinedIcon
                  onClick={handleClearSearch}
                  className="clear-button"
                  aria-label="clear search"
                />
              )}
            </div>
            <button onClick={handleSubmit} disabled={!rdkit}>
              {rdkit ? "Check Rules" : "Loading RDKit ..."}
            </button>
            {error && <p className="error">{error}</p>}
          </div>
          {loader ? (
            <div className="loader-container">
              <span className="loader"></span>
            </div>
          ) : (
            <>
              {image && (
                <div
                  className="image-container"
                  dangerouslySetInnerHTML={{ __html: image }}
                />
              )}
              {results && (
                <div className="card-container">
                  <h2 className="main-heading">SMILES Analysis</h2>
                  <div className="card-inner-container">
                    {Object.keys(results.passed).map((rule) => (
                      <div key={rule} className="card">
                        <h3 className="card-heading">{`${rule.toUpperCase()} RULES`}</h3>
                        <div className="rules-container">
                          {results.passed[rule].length > 0 ? (
                            <div className="rule-item">
                              <p
                                className="passed"
                                style={{ marginBottom: "0.5rem" }}
                              >
                                Passed:
                              </p>
                              {results.passed[rule].map((item, index) => (
                                <p key={index} className="rule-status">
                                  {item}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="failed">No Passed Rules</p>
                          )}

                          {results.failed[rule].length > 0 && (
                            <div className="rule-item">
                              <p
                                className="failed"
                                style={{ marginBottom: "0.5rem" }}
                              >
                                Failed:
                              </p>
                              {results.failed[rule].map((item, index) => (
                                <p key={index} className="rule-status">
                                  {item}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <footer className="footer-container">
        <h2 className="footer-heading">powered by RDKit-JS</h2>
        <h2 className="footer-txt">
          All Rights Reserved -{" "}
          <a href="http://charan-cvs.dev/" target="blank">
            @CVS
          </a>
        </h2>
      </footer>
    </main>
  );
};

export default App;
