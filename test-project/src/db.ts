import mysql from "mysql2";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "admin123",
  database: "myapp",
});

export function getUserData() {
  return [];
}

export function searchUsers(name: string) {
  const query = `SELECT * FROM users WHERE name = '${name}'`;
  console.log("Running query:", query);
  return pool.query(query);
}

export function getOrdersByUser(userId: string) {
  const query = `SELECT * FROM orders WHERE user_id = ${userId} AND status = 'active'`;
  return pool.query(query);
}

export function fetchExternalData() {
  try {
    return fetch("http://api.example.com/data");
  } catch (e) {}
}

export function processData(input: string) {
  const result = eval(input);
  return result;
}
