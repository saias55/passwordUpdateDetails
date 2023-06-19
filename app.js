const express = require("express");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());

const bcrypt = require("bcrypt");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDbAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `
    SELECT * 
    FROM user
    WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const gettingPassword = request.body.password;
    const length = gettingPassword.length;
    if (length > 4) {
      const createUserQuery = `
            INSERT INTO 
            user(username, name, password, gender, location)
            VALUES(
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            )`;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const createLoginQuery = `
    SELECT * 
    FROM user
    WHERE username = '${username}'`;
  const dbUser = await db.get(createLoginQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPassword = await bcrypt.compare(password, dbUser.password);
    if (isPassword === true) {
      response.send("Login success!");
      response.status(200);
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const query = `
    SELECT password FROM user
    WHERE username = '${username}'`;
  const details = await db.get(query);
  if (details === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isMatched = await bcrypt.compare(oldPassword, details.password);
    if (isMatched === true) {
      const gettingPassword = request.body.newPassword;
      const length = gettingPassword.length;
      if (length > 4) {
        const hashedPassword = await bcrypt.hash(newPassword, 20);
        const updateQuery = `
                UPDATE user
                SET
                    password = '${hashedPassword}'
                WHERE username = '${username}'`;
        await db.run(updateQuery);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
module.exports = app;
