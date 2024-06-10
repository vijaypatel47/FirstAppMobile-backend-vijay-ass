const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const dbPath = path.join(__dirname, "users.db");

const app = express();

app.use(express.json());

let db = null;

const intilializeData = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running on http://localhost:3000")
    );
  } catch (e) {
    console.log(`DB ERROR: ${e.message}`);
    process.exit(1);
  }
};

intilializeData();

// Get all users

app.get("/", async (request, response) => {
  let jwtToken = "";
  let authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        const queryData = `
        SELECT 
        *
        FROM
       user
       `;
        const responseData = await db.all(queryData);
        response.send(responseData);
      }
    });
  }
});

// Register

app.post("/register", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const getUsername = `
    select
    * 
    from 
    user 
    where username='${username}';
    `;
  const dbUser = await db.get(getUsername);
  if (dbUser === undefined) {
    const createUser = `
        INSERT INTO user(username,password)
        VALUES('${username}','${hashedPassword}')
        `;
    const sendData = db.run(createUser);
    response.send("user Created Successfully");
  } else {
    response.status(400);
    response.send("Already user Register");
  }
});

// Login

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUsername = `
    select
    * 
    from 
    user 
    where username='${username}';
    `;
  const dbUser = await db.get(getUsername);

  if (dbUser === undefined) {
    response.status(400);
    response.send("please register first username not find");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

//change password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await db.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = `
          UPDATE
            user
          SET
            password = '${hashedPassword}'
          WHERE
            username = '${username}';`;

      const user = await db.run(updatePasswordQuery);

      response.send("Password updated");
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

// API fetch

app.get("/api/characters", async (req, res) => {
  try {
    const url = req.query.url || "https://swapi.dev/api/people";
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching characters:", error);
    res.status(500).json({ error: "Failed to fetch characters" });
  }
});
