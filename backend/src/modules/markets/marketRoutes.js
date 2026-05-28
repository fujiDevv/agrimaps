const { Router } = require("express");
const marketController = require("./marketController");

const router = Router();
router.get("/", marketController.list);
router.get("/geojson", marketController.getGeoJSON);

module.exports = router;
