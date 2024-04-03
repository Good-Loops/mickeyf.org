<?php
// For Cloud SQL MySQL
$db_host = 'localhost';
$db_name = 'cms';
$db_user = 'cms_mickeyf';
$db_pass = '.4gUR)uzKK]1E!Xw';

// When deployed on Google App Engine, use the instance connection name.
if (getenv('GAE_ENV') === 'standard') {
    // Format: <PROJECT-ID>:<REGION>:<INSTANCE-ID>
    $db_host = ':/cloudsql/noted-reef-387021:us-central1:cms-mickeyf';
}

// Use MySQLi to connect to Cloud SQL
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if (mysqli_connect_error()) {
    echo mysqli_connect_error();
    exit;
}

// Execute a SQL query
$result = $conn->query('SELECT * FROM your_table');

// Check if the query was successful
if (!$result) {
    echo $conn->error;
    exit;
}

// Fetch all rows as an associative array
$data = $result->fetch_all(MYSQLI_ASSOC);

// Send the data as a JSON response
header('Content-Type: application/json');
echo json_encode($data);
