<?php
header("Access-Control-Allow-Origin: http://localhost:5000");
header("Access-Control-Allow-Headers: Content-Type");

include 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $sql = "SELECT userId, userName, email FROM Users";
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
  if (empty($data['userName']) || empty($data['email']) || empty($data['password'])) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'EMPTY_FIELDS']));
  }

  if (strlen($data['password']) < 8 || strlen($data['password']) > 16) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'INVALID_PASSWORD']));
  }

  $userName = filter_var($data['userName'], FILTER_SANITIZE_STRING);
  $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
  $password = $data['password'];

  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'INVALID_EMAIL']));
  }

// Prepare a SELECT statement to check if the username or email already exists
$stmt = $conn->prepare("SELECT userId FROM Users WHERE userName = ? OR email = ?");
$stmt->bind_param("ss", $userName, $email);

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
  $stmt = $conn->prepare("INSERT INTO Users (userName, email, password) VALUES (?, ?, ?)");
  $stmt->bind_param("sss", $userName, $email, $hashedPassword);

  // Execute the statement
  $stmt->execute();

  echo json_encode(['status' => 'success']);

  $stmt->close();
}

$conn->close();
?>