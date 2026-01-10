const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js")

const MONGO_URL ="mongodb://127.0.0.1:27017/wanderlust";
main()
.then(()=>{
    console.log("connected to DB");
})
.catch((err) =>{ 
    console.log(err);
});

async function main() {
  await mongoose.connect(MONGO_URL);
}
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

app.get("/",(req,res) =>{
    res.send("Hi, I am root");
});
//index route
app.get("/listings",wrapAsync(async(req,res)=>{
    const allListings = await Listing.find({});
    res.render("listings/index.ejs",{allListings});
}));
//new route
app.get("/listings/new",(req,res)=>{
    res.render("listings/new.ejs")
});

//show route
app.get("/listings/:id", wrapAsync(async (req,res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/show.ejs",{listing})
}));
//create route
app.post("/listings",wrapAsync(async(req,res,next)=>{
    if(!req.body.listing){
        throw new ExpressError(400,"Send valid Data for listing");
    }
     const newListing = new Listing(req.body.listing);
     await newListing.save();
     res.redirect("/listings");
    })
);
//Edit route
app.get("/listings/:id/edit",wrapAsync(async(req,res)=>{
 let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit",{listing});
}));
// update route
app.put("/listings/:id",wrapAsync(async (req, res) => {
  const { id } = req.params;
  const data = req.body.listing;

  const listing = await Listing.findById(id);

  // update normal fields
  listing.title = data.title;
  listing.description = data.description;
  listing.price = data.price;
  listing.location = data.location;
  listing.country = data.country;

  // update image ONLY if user entered a new one
  if (data.image && data.image.url && data.image.url.trim() !== "") {
    listing.image.url = data.image.url;
  }

  await listing.save();
  res.redirect(`/listings/${id}`);
}));

//delete route
app.delete("/listings/:id",wrapAsync(async(req,res)=>{
 let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    res.redirect("/listings/");
}));
//app.get("/testlisting",async(req,res)=>{
  //  let sampleListing = new Listing({
    //    title:"My New Villa",
      //  description:"By the Beach",
      //  price:1200,
      //  location:"Calangute,Goa",
      //  country:"India",
    //});
   
//    await sampleListing.save();
  //  console.log("sample was saved");
 //   res.send("successful testing");
//});
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
   res.render("error.ejs",{message});
    // res.status(statusCode).send(message);
});
app.listen(8080, () => {
    console.log("server listening to port 8080");
});
