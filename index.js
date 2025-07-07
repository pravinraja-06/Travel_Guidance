import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import axios from "axios";
import { name } from "ejs";
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "travel",
  password: "pravinraja",
  port: 5432,
});
db.connect();
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;
const saltRound = 10;

const API_KEY = "5ae2e3f221c38a28845f05b63f8a2b925c325cb09395d8efc1e432e9";
const API_KEY_WEATHER = "66f462dd936f9dee8cac34d1f386487d";
const unsplash_API = "vkJaPc6HWDvAqitCUbn_jh4WWfGvzHrS7wm9irozvKs";
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/html/login.html");
});
app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/public/html/register.html");
});
//login page
app.post("/login", async (req, res) => {
  const loginEmail = req.body.email;
  const loginPassword = req.body.password;
  try {
    const loginResult = await db.query("SELECT * FROM users WHERE email=$1", [
      loginEmail,
    ]);
    if (loginResult.rows.length > 0) {
      const user = loginResult.rows[0];
      const storedPassword = user.password;
      bcrypt.compare(loginPassword, storedPassword, (err, hash) => {
        if (err) {
          console.log(err.message);
        } else {
          if (hash) {
            res.sendFile(__dirname + "/public/html/dashboard.html");
          } else {
          res.redirect("/");
        }
        }
      });
    } else {
          res.redirect("/");
        }
  } catch (err) {
    console.log(err);
  }
});
// resgiter page
app.post("/register", async (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (checkResult.rows.length > 0) {
      res.redirect("/register");
    } else {
      bcrypt.hash(password, saltRound, async (err, hash) => {
        if (err) {
          console.log(err.message);
        } else {
          const result = await db.query(
            "INSERT INTO users(name,email,password) VALUES ($1,$2,$3)",
            [name, email, hash]
          );
          console.log(result);
           res.sendFile(__dirname + "/public/html/login.html");
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//destination
app.get("/explore", (req, res) => {
  res.render("destination.ejs");
});

app.post("/explore", async (req, res) => {
  const city = req.body.city;
  const category = req.body.category;

  try {
    // Step 1: Get coordinates
    const geoRes = await axios.get(
      "https://api.opentripmap.com/0.1/en/places/geoname",
      {
        params: {
          name: city,
          apikey: API_KEY,
        },
      }
    );

    const lat = geoRes.data.lat;
    const lon = geoRes.data.lon;

    // Step 2: Get places
    const placesRes = await axios.get(
      "https://api.opentripmap.com/0.1/en/places/radius",
      {
        params: {
          lat,
          lon,
          radius: 30000,
          rate: 2,
          limit: 20,
          kinds: category,
          format: "json",
          apikey: API_KEY,
        },
      }
    );
    console.log(placesRes.data);

    res.render("destination.ejs", {
      places: placesRes.data,
    });
  } catch (error) {
    console.error(error);
    res.send("Could not fetch tourist data. Please try again.");
  }
});

//information

app.get("/information/:name/:lat/:lon", async (req, res) => {
  const placeName = req.params.name;
  const lat = req.params.lat;
  const lon = req.params.lon;
  const weather = await axios.get(
    "https://api.openweathermap.org/data/2.5/weather",
    {
      params: {
        lat,
        lon,
        apikey: "66f462dd936f9dee8cac34d1f386487d",
        units: "metric",
      },
    }
  );
  console.log(name);
  const weatherData = weather.data;
  // Build place object for EJS
  const place = {
    name: placeName,
    weather: `${weatherData.weather[0].description}, ${weatherData.main.temp}°C`,
    feels_like: `${weatherData.main.feels_like}°C`,
    humidity: `${weatherData.main.humidity}%`,
    wind: `${weatherData.wind.speed} m/s`,
    pressure: `${weatherData.main.pressure} hPa`,
    point: {
      lat,
      lon,
    },
  };

  console.log(weatherData);
  const imageData = await axios.get("https://api.unsplash.com/search/photos", {
    params: {
      query: placeName,
      per_page: 6,
      client_id: unsplash_API,
    },
  });
  const results = imageData.data.results;

  // Extract URLs + alt text into an array
  const images = results.map((photo) => ({
    url: photo.urls.small,
    alt: photo.alt_description || placeName,
  }));

  // If no images found, you can push a default image
  if (images.length === 0) {
    images.push({
      url: "/default-image.jpg", // ensure this exists in your /public folder
      alt: "No image available",
    });
  }

  res.render("information.ejs", {
    place,
    images,
  });
});

app.listen(port, () => {
  console.log(port);
});
