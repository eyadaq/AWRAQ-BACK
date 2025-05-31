import db from "./firebs";

async function addItem() {
  const userRef = db.collection("users").doc(); // auto-generated ID
  await userRef.set({
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date(),
  });

  console.log("User added with ID:", userRef.id);
}

addItem();
