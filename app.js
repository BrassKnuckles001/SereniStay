const express = require("express");
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
// const routes = require('./routes/route1')
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const wrapAsync = require("./utils/WrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js")
const { reviewSchema } = require("./schema.js")
const Review = require("./models/review.js")

require('dotenv').config();


const app = express();

// app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"))
app.engine("ejs", ejsMate)
app.use(express.static(path.join(__dirname, "/public")));

main()
    .then(() => {
        console.log("Connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });


async function main() {
    await mongoose.connect(process.env.MONGO_URL);
}

// Root 
app.get("/", (req, res) => {
    res.send("Helloww, I am root");
});

// Validations --------------------
// 1. listing joi
const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
}
//2 . review joi
const validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
}



// New Route
app.get("/pathlistings/new", wrapAsync((req, res) => {
    res.render("listings/new.ejs")
}))

// Show Route
app.get("/pathlistings", wrapAsync(async (req, res, next) => {
    try {
        console.log("Views directory:", app.get("views"));
        const allListings = await Listing.find({});
        res.render("listings/index", { allListings })
    } catch (error) {
        next(error)
    }

}))

// Create Route
app.post("/pathlistings", validateListing, wrapAsync(async (req, res) => {
    let new_listing = new Listing(req.body.listing);
    await new_listing.save();
    res.redirect("/pathlistings");
}))

// Index Route 
app.get("/pathlistings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing_x = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs", { listing_x });
}))

// Edit Route
app.get("/pathlistings/:id/edit", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing_x = await Listing.findById(id)
    res.render("listings/edit.ejs", { listing_x })
}))

//Update Route
app.put("/pathlistings/:id", validateListing, wrapAsync(async (req, res) => {

    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing })
    res.redirect(`/pathlistings/${id}`)
}))

// Delete Route
app.delete("/pathlistings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id)
    console.log(deletedListing);
    res.redirect("/pathlistings")
}))


//Reviews -----------------------------------------------------------
//Create Review - POST route
app.post("/pathlistings/:id/reviews", validateReview, wrapAsync( async (req, res) => {
    let listing = await Listing.findById(req.params.id)
    let newReview = new Review(req.body.review)
    listing.reviews.push(newReview)
    await newReview.save()
    await listing.save()
    res.redirect(`/pathlistings/${listing._id}`)
    console.log("Review created successfully")
}))

// Delete Review Route
app.delete("/pathlistings/:id/reviews/:reviewId" , wrapAsync( async(req,res) => {
    let { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id , {$pull: {reviews: reviewId}})
    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/pathlistings/${id}`)
}))

// app.get("/testlisting", (req, res) => {
//     let samplelisting = new Listing({
//         title: "Canaught Palace",
//         description: "most viewed palace",
//         price: 3000,
//         location: "Canaught city , Amritsar",
//         country: "India"
//     });

//     samplelisting.save();
//     console.log("sample was saved");
//     res.send("successfull testing");
// });


app.listen(process.env.PORT, '0.0.0.0', () => {
    console.log(`Server is listening to port ${process.env.PORT}`);
});

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found"))
})

app.use((error, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong!" } = error;
    res.status(statusCode).render("error.ejs", { statusCode, message });
});


// app.use('/',routes)
// mongoose.connect('mongodb://127.0.0.1:27017/Smartphone_Details')
// .then(()=>{console.log('connnected to MongoDB ')})
// .catch(err=>{console.log(err);
// })
