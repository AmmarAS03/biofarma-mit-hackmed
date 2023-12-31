const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const dotenv = require("dotenv");
const bcrypt = require('bcryptjs');

dotenv.config({ path: "./config.env" });

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
  socketPath: process.env.DATABASE_SOCKET,
});

const router = express.Router();

router.get("/", (req, res) => {
  const query = "SELECT * FROM ANAK ORDER BY TAHUN_MASUK, NAMA, TANGGAL_LAHIR";
  db.query(query, (error, anakData) => {
    if (error) {
      console.log(error);
      res.render("error", { message: "Error retrieving anak data." });
    } else {
      const formattedAnakData = anakData.map((anak) => {
        const dateOfBirth = new Date(anak.tanggal_lahir);
        const options = {
          year: "numeric",
          month: "long",
          day: "numeric",
        };
        const formattedDateOfBirth = dateOfBirth.toLocaleDateString(
          "id-ID",
          options
        );
        return {
          ...anak,
          tanggal_lahir: formattedDateOfBirth,
        };
      });
      res.render("main", { anakList: formattedAnakData });
    }
  });
});

// routes/pages.js
router.get('/anak/:id', (req, res) => {
    const anakId = req.params.id;

    // Fetch the child's details and associated clinical trial data from the database
    const queryAnak = 'SELECT * FROM anak WHERE nisn = ?';
    const queryClinicalTrials = `
    SELECT ct.*, m.kode AS medicine_kode, m.nama AS medicine_name
    FROM clinical_trials AS ct
    LEFT JOIN medicine AS m ON ct.medicine_kode = m.kode
    WHERE ct.nisn = ?
`;


    db.query(queryAnak, [anakId], (error, anakData) => {
        if (error || anakData.length === 0) {
            console.log(error);
            //res.render('error', { message: 'Child not found.' });
        } else {
            db.query(queryClinicalTrials, [anakId], (clinicalTrialsError, clinicalTrialsData) => {
                if (clinicalTrialsError) {
                    console.log(clinicalTrialsError);
                    //res.render('error', { message: 'Error retrieving clinical trial data.' });
                } else {
                    
                    const formattedAnakData = {
                        ...anakData[0],
                        // Format the tanggal_lahir field
                        tanggal_lahir: new Date(anakData[0].tanggal_lahir).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                        })
                    };

                    res.render('anakDetails', {
                        anak: formattedAnakData,
                        clinicalTrialsList: clinicalTrialsData.map(clinicalTrial => {
                            return {
                                ...clinicalTrial,
                                medicine_name: clinicalTrial.medicine_name,
                                medicine_kode: clinicalTrial.medicine_kode
                            };
                        })
                    });
                }
            });
        }
      });
    }
);




router.get('/addClinicalTrial/:nisn', (req, res) => {
    const nisn = req.params.nisn;

    // Render the page for adding clinical trial data, passing nisn to the view
    res.render('addClinicalTrial', { nisn });
});


router.post('/updateClinicalTrial/:id', (req, res) => {
    const clinicalTrialId = req.params.id;
    const {
        heart_rate_24,
        blood_pressure_24,
        respirate_24,
        temperature_24,
        pain_score_24,
        pain_location_24,
        pain_quality_24,
        pain_quantity_24,
        pain_frequency_24,
        pain_situation_24,
        pain_factors_24,
        other_symptoms_24,
    } = req.body;

    // Update the clinical trial data in the database
    const updateQuery = `
        UPDATE clinical_trials
        SET
            heart_rate_24 = ?,
            blood_pressure_24 = ?,
            respirate_24 = ?,
            temperature_24 = ?,
            pain_score_24 = ?,
            pain_location_24 = ?,
            pain_quality_24 = ?,
            pain_quantity_24 = ?,
            pain_frequency_24 = ?,
            pain_situation_24 = ?,
            pain_factors_24 = ?,
            other_symptoms_24 = ?
        WHERE id = ?
    `;

    db.query(
        updateQuery,
        [
            heart_rate_24,
            blood_pressure_24,
            respirate_24,
            temperature_24,
            pain_score_24,
            pain_location_24,
            pain_quality_24,
            pain_quantity_24,
            pain_frequency_24,
            pain_situation_24,
            pain_factors_24,
            other_symptoms_24,
            clinicalTrialId
        ],
        (error, result) => {
            if (error) {
                console.log(error);
                res.status(500).send('Error submitting clinical trial data.');
            } else {
                res.status(200).send('Clinical trial data submitted successfully.');
            }
        }
    );
});

// ... other imports ...

router.get('/renderJSON', (req, res) => {
    const query = 'SELECT * FROM clinical_trials';
    
    db.query(query, (error, clinicalTrialsData) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error fetching clinical trials data.');
        } else {
            const hashedClinicalTrialsData = clinicalTrialsData.map(clinicalTrial => {
                const { nisn, ...rest } = clinicalTrial; // Destructure nisn and create a new object with the rest of the properties
                const hashedNisn = bcrypt.hashSync(nisn.toString(), 8); // Convert nisn to string
                return {
                    ...rest, // Spread the rest of the properties
                    hashed_nisn: hashedNisn,
                };
            });
            res.json(hashedClinicalTrialsData);
        }
    });
});

router.get('/biofarma', (req, res) => {
    const query = 'SELECT * FROM clinical_trials';

    db.query(query, (error, clinicalTrialsData) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error fetching clinical trials data.');
        } else {
            const hashedClinicalTrialsData = clinicalTrialsData.map(clinicalTrial => {
                const { nisn, ...rest } = clinicalTrial; // Destructure nisn and create a new object with the rest of the properties
                const hashedNisn = bcrypt.hashSync(nisn.toString(), 8).substring(0, 10); // Convert nisn to string
                return {
                    ...rest, // Spread the rest of the properties
                    hashed_nisn: hashedNisn,
                };
            });
            res.render('biofarma', {
                hashedClinicalTrialsData
            });
        }
    });
})

// ... rest of your code ...

// ... rest of your code ...



module.exports = router;
