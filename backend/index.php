<?php

include 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $sql = "SELECT user_id, user_name, email FROM User";
  $result = $conn->query($sql);

  $rows = array();
  if ($result->num_rows > 0) {
    // output data of each row
    while ($row = $result->fetch_assoc()) {
      $rows[] = $row;
    }
  } else {
      echo "0 results\n";
  }

  header('Content-Type: application/json');
  echo json_encode($rows);
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Get the raw POST data
  $data = json_decode(file_get_contents('php://input'), true);

  // Validate the data
  if (empty($data['user_name']) || empty($data['email']) || empty($data['password'])) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'EMPTY_FIELDS']));
  }

  if (strlen($data['password']) < 8 || strlen($data['password']) > 16) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'INVALID_PASSWORD']));
  }

  $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
  $password = $data['password'];

  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'INVALID_EMAIL']));
  }

// Prepare a SELECT statement to check if the username or email already exists
$stmt = $conn->prepare("SELECT user_id FROM User WHERE user_name = ? OR email = ?");
$stmt->bind_param("ss", $user_name, $email);

// Execute the statement
$stmt->execute();

// Get the result
$result = $stmt->get_result();

// If there's at least one row in the result, then the username or email is already registered
if ($result->num_rows > 0) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'DUPLICATE_USER']));
}

$stmt->close();

  // Hash the password
  $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

  // Prepare and bind
  $stmt = $conn->prepare("INSERT INTO Users (user_name, email, password) VALUES (?, ?, ?)");
  $stmt->bind_param("sss", $user_name, $email, $hashedPassword);

  // Execute the statement
  $stmt->execute();

  echo json_encode(['status' => 'success']);

  $stmt->close();
}

$conn->close();