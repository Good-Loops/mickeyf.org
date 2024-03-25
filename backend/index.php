<?php
    // Set the headers to allow cross-origin requests (CORS)
    header("Access-Control-Allow-Origin: http://localhost:7777");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");

    // Include the database connection file
    include 'db_connect.php';

    // Check if the request method is GET or POST
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Prepare a SELECT statement to get all the users
        $sql = "SELECT user_id, user_name, email FROM User";
        $result = $conn->query($sql);

        $rows = array();

        // If there's at least one row in the result, then fetch the rows
        if ($result->num_rows > 0) {
            // Output data of each row
            while ($row = $result->fetch_assoc()) {
                $rows[] = $row;
            }
        } else {
            $rows = [];
        }

        // Output the JSON data
        header('Content-Type: application/json');
        echo json_encode($rows);

    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get the raw POST data
        $data = json_decode(file_get_contents('php://input'), true);

        // Check if the user_name, email, and password fields are not empty
        if (empty($data['user_name']) || empty($data['email']) || empty($data['password'])) {
            header('Content-Type: application/json');
            die(json_encode(['error' => 'EMPTY_FIELDS']));
        }

        // Validate the password length (8-16 characters)
        if (strlen($data['password']) < 8 || strlen($data['password']) > 16) {
            header('Content-Type: application/json');
            die(json_encode(['error' => 'INVALID_PASSWORD']));
        }

        // Get the user_name, email, and password from the POST data
        $user_name = $data['user_name'];  
        $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
        $password = $data['password'];

        // Validate the email
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

        // Close the statement
        $stmt->close();

        // Hash the password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // Prepare and bind
        // VALUES (?, ?, ?) are placeholders for the user_name, email, and password
        $stmt = $conn->prepare("INSERT INTO User (user_name, email, password) VALUES (?, ?, ?)");
        // "sss" means that the parameters are strings
        $stmt->bind_param("sss", $user_name, $email, $hashedPassword);

        // Execute the statement
        $stmt->execute();

        // Output the JSON data
        echo json_encode(['status' => 'success']);

        // Close the statement
        $stmt->close();
    }
    // Close the connection
    $conn->close();