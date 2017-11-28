var express = require('express')
var router = express.Router()

// ----------------------------------------------------------------------------
//  Methods for /licenses
// ----------------------------------------------------------------------------
router.route('/')

  .get((req, res) => {
    req.db.all("SELECT * FROM licenses", (err, rows) => {
      res.json(rows)
    })
  })

// ----------------------------------------------------------------------------
//  Methods for /search/:id
// ----------------------------------------------------------------------------
router.route('/search/:id')
  .get((req, res) => {
    // precondition: parameter is wellformed
    // TODO: write a function that performs checks on input, so that it is wellformed, i.e. it's only english characters
    const query = `select * from licenses where licenseName LIKE "%${req.params.id}%"`
    req.db.all(query, (err, rows) => {
      if (err) {
        console.log(err)
        res.status(404)
        res.send("ERROR! error message:" + err.message + ", query: " + query)
      } else {
        res.status(200)
        res.json(rows)
      }
    })
  })

// ----------------------------------------------------------------------------
//  Methods for /add
// ----------------------------------------------------------------------------
router.route('/add')
  .post((req, res) => {
    // pre-condition:
    // TODO: validate request
    const lic = req.body
    const date = new Date().toLocaleDateString()
    // Construct SQL query based on input parameters.
    const query = `INSERT INTO licenses (licenseName, licenseVersion, dateCreated, lastEdited, URL, comment, licenseType) VALUES ('${lic.licenseName}', '${lic.licenseVersion}', '${date}', '${date}', '${lic.URL}', '${lic.comment}', '${lic.licenseType}')`
    // Send the license to the database.
    req.db.run('begin', () => {
      req.db.run(query, (error) => {
        if (error) {
          console.log(error.message)
          res.status(500)
          res.send(error.message)
          res.error_id = "E04"
        } else {
          let licenseID = 1
          const queryGetID = "SELECT MAX(id) AS 'id' FROM licenses"
          req.db.get(queryGetID, (error, row) => {
            if (error) {
              // If there's an error then provide the error message and the different attributes that could have caused it.
              res.send("ERROR! error message:" + error.message + " query: " + queryGetID)
            } else {
              licenseID += row.id
            }
          })
          // Log the creation of the license.
          const logquery = `INSERT INTO licenseLog (licenseID, dateLogged, note) VALUES (${licenseID}, '${date}', 'License created.')`
          req.db.run(logquery, (error) => {
            if (error) {
              console.log(error.message)
              res.status(500)
              res.send(error.message)
            } else {
              console.log("Success!")
              req.db.run('commit')
              res.status(201)
              res.send('success')
            }
          })
        }
      })
    })
    // postcondition: component created and logged.
  })


// ----------------------------------------------------------------------------
//  Methods for /componentLicenses/:id
// ----------------------------------------------------------------------------
router.route('/licensesInComponent/:id')
  .get((req, res) => {
    let componentID = req.params.id
    console.log(componentID)
    let query = `SELECT licenseID, licenseName, licenseVersion, dateCreated, lastEdited, comment, URL FROM  licenses INNER JOIN licensesInComponents ON licenses.id=licensesInComponents.licenseID WHERE 
    componentID=${componentID}`
    req.db.all(query, (err, rows) => {
      res.json(rows)
    })
  })

// ----------------------------------------------------------------------------
//  Methods for /log/:id
// ----------------------------------------------------------------------------
router.route('/log/:id')
  .get((req, res) => {
    // precondition: license exists.
    let input = req.params.id
    if (input != null) {
      //Get the license log
      getLicenseLog(req, res, input)
    }
    // postcondition: the log entries of the license
  })
// ----------------------------------------------------------------------------
// Methods for /licensesInProduct/:id
// ----------------------------------------------------------------------------
router.route('/licensesInProduct/:id')
  .get((req, res) => {
    // precondition: the product must exists and it must also be connected to atleast one component.
    //This component must inturn be connected to a license.
    let input = req.params.id
    if (input != null) {
      //Get licenses from the product
      getLicensesFromProduct(req, res, input)
    }
    // postcondition: licenses connected to the product.
  })
// ----------------------------------------------------------------------------
// Methods for /licensesInProject/:id
// ----------------------------------------------------------------------------
router.route('/licensesInProject/:id').get((req, res) => {
  // precondition: the project must exists and it must also be connected to atleast one product.
  //This product must inturn be connected to a component.
  //Which also must be connected to a license.
  let input = req.params.id
  if (input != null) {
    //Get licenses from the project
    getLicensesFromProject(req, res, input)
  }
  // postcondition: licenses connected to the project.
})

// ----------------------------------------------------------------------------
//  Methods for /licenses/:id
// ----------------------------------------------------------------------------
router.route('/:id')

  // Search for a license, or license attribute.
  // In order to search; send in a JSON object with the applicable parameters.
  .get((req, res) => {
    let input = req.params.id
    const query = `SELECT * FROM licenses WHERE id=${input}`
    req.db.get(query, (err, row) => {
      if (err) {
        console.log(err)
        res.status(404)
        res.send("ERROR! error message:" + err.message + ", query: " + query)
      } else {
        res.status(200)
        res.json(row)
      }
    })
  })

  // ----------------------------------------------------------------------------
  // Methods for /comment
  // ----------------------------------------------------------------------------
  router.route('/comment')
    .post((req, res) => {
      // precondition: License exists.
      let input = req.body
      if (input.id != null && input.comment != null) {
        //Get licenses from the product
        setLicenseComment(req, res, input)
      } else {
        res.status(406).send("ERROR! ID or Comment was not provided.")
      }
      // postcondition: The comment of the license is changed.
    })


  /**
   * Changes the comment of a license.
   * @param {Integer} id
   * @param {String} comment
   */
  function setLicenseComment(req, res, input){
    let query = "UPDATE licenses SET comment = ? WHERE id = ?;"

    req.db.all(query, [input.comment, input.id], (err, rows) => {
      if (err) {
        // If there's an error then provide the error message and the different attributes that could have caused it.
        res.send("ERROR! error message:" + err.message + ", query: " + query)
      } else
        res.status(200).send("success");
    })
  }

  // ----------------------------------------------------------------------------
  // Methods for /URL
  // ----------------------------------------------------------------------------
  router.route('/URL')
    .post((req, res) => {
      // precondition: License exists.
      let input = req.body
      if (input.id != null && input.URL != null) {
        //Get licenses from the product
        setLicenseURL(req, res, input)
      } else {
        res.status(406).send("ERROR! ID or URL was not provided.")
      }

// postcondition: The URL of the license is changed.
    })

/**
 * Changes the URL of a license.
 * @param {Integer} id
 * @param {String} URL
 */
function setLicenseURL(req, res, input){
  let query = "UPDATE licenses SET URL = ? WHERE id = ?;"

  req.db.all(query, [input.URL, input.id], (err, rows) => {
    if (err) {
      // If there's an error then provide the error message and the different attributes that could have caused it.
      res.send("ERROR! error message:" + err.message + ", query: " + query)
    } else
      res.status(200).send("success");
  })
}

/**
 * Gets the log of a license.
 * @param {Integer} id
 */
function getLicenseLog(req, res, id) {
  let query = "SELECT * FROM licenseLog WHERE licenseID = ?"

  req.db.all(query, [id], (error, rows) => {
    if (error) {
      console.log(error.message)
      res.status(500)
      res.send(error.message)
    } else {
      res.send(rows)
    }
  })
}

/**
 * Gets the licenses connected with a product.
 * @param {Integer} id
 */
function getLicensesFromProduct(req, res, id) {

  let query = "SELECT DISTINCT licenseID AS id , licenseName, licenseVersion, dateCreated, lastEdited, comment FROM licenses LEFT OUTER JOIN"
    + " licensesInComponents ON licenses.id=licensesInComponents.licenseID LEFT OUTER JOIN componentsInProducts ON componentsInProducts.componentID=licensesInComponents.componentID"
    + " WHERE productID = ?;"

  req.db.all(query, [id], (err, rows) => {
    if (err) {
      // If there's an error then provide the error message and the different attributes that could have caused it.
      res.send("ERROR! error message:" + err.message + ", query: " + query)
    } else
      res.json(rows)
  })
}

/**
 * Gets the licenses connected with a project.
 * @param {Integer} id
 */
function getLicensesFromProject(req, res, id) {

  let query = "SELECT DISTINCT licenseID AS id , licenseName, licenseVersion, dateCreated, lastEdited, comment FROM licenses LEFT OUTER JOIN licensesInComponents ON licenses.id=licensesInComponents.licenseID"
              +" LEFT OUTER JOIN componentsInProducts ON componentsInProducts.componentID=licensesInComponents.componentID"
              +" LEFT OUTER JOIN productsInProjects ON productsInProjects.productID=componentsInProducts.productID"
    + " WHERE projectID = ?;"

  req.db.all(query, [id], (err, rows) => {
    if (err) {
      // If there's an error then provide the error message and the different attributes that could have caused it.
      res.send("ERROR! error message:" + err.message + ", query: " + query)
    } else
      res.json(rows)
  })
}
module.exports = router
