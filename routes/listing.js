const express = require ("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError=require("../utils/ExpressError.js");
const {isLoggedIn,isOwner,validateListing} = require("../middleware.js");
const{listingSchema,reviewSchema} = require("../schema.js");
const Listing = require("../models/listing.js");
const multer = require('multer');
const {storage} = require("../cloudConfig.js");
const upload = multer({storage});

//for filters
router.get("/", wrapAsync(async (req, res) => {
  const { category, search } = req.query;

  let query = {};

  if (category) {
    query.category = category;
  }

  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  const allListings = await Listing.find(query);

  res.render("listings/index.ejs", { allListings });
}));


//new route
router.get("/new",isLoggedIn,(req,res)=>{
    res.render("listings/new.ejs")
});

//show route
router.get("/:id", wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate("owner")
    .populate({path:"reviews",populate:
      {
        path:"author"

      }
    });

    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

   res.render("listings/show.ejs", {
  listing,
});

}));
router.post("/",
  isLoggedIn,
  upload.single("image"), 
  validateListing,
  wrapAsync(async (req, res) => {

    // Create route
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;


    const geoResponse = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(
        req.body.listing.location
      )}.json?key=${process.env.MAP_TOKEN}`
    );

    const geoData = await geoResponse.json();

   if (geoData.features && geoData.features.length > 0) {
  newListing.geometry = {
    type: "Point",
    coordinates: geoData.features[0].geometry.coordinates
  };
} else {
  newListing.geometry = {
    type: "Point",
    coordinates: [77.2090, 28.6139] // fallback
  };
}


    if (req.file) {
      newListing.image = {
        url: req.file.path,
        filename: req.file.filename
      };
    }

    await newListing.save();

    req.flash("success", "New Listing created!");
    res.redirect("/listings");
  })
);

//Edit route
router.get("/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit", { listing });
  })
);

// update route
router.put("/:id",
  isLoggedIn,
  isOwner,
  upload.single("image"),  
  validateListing,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const data = req.body.listing;

    const listing = await Listing.findById(id);

    listing.title = data.title;
    listing.description = data.description;
    listing.price = data.price;
    listing.location = data.location;
    listing.country = data.country;

    if (req.file) {
  listing.image = {
    url: req.file.path,
    filename: req.file.filename
  };
}
    await listing.save();
    res.redirect(`/listings/${id}`);
  })
);

//delete route
router.delete("/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
  })
);



module.exports = router;
