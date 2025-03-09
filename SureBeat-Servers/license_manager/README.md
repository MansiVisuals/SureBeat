# License Manager

This project is a web-based application for managing software licenses and trials. It provides a user-friendly interface to add, remove, and expire licenses, as well as manage trial periods.

## Project Structure

The project is organized into the following directories:

- **server**: Contains the backend code, including API routes, database connection, services, utilities, and middleware.
  - **api**: Defines the API routes for managing licenses, trials, and authentication.
  - **database**: Initializes the SQLite database connection.
  - **services**: Contains business logic for managing licenses and trials.
  - **utils**: Provides utility functions for encryption and validation.
  - **middleware**: Contains authentication middleware.
  - **server.js**: The entry point of the server application.

- **public**: Contains the frontend code, including HTML, CSS, and JavaScript files.
  - **css**: Contains styles for the web application.
  - **js**: Contains JavaScript files for managing licenses and trials on the client side.
  - **components**: Contains reusable components for the user interface.
  - **index.html**: The main HTML file for the web application.

- **config**: Contains configuration settings for the application.

- **package.json**: The configuration file for npm, listing dependencies and scripts.

- **.env**: Contains environment variables for the application.

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd license-manager
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Set up the environment variables**:
   Create a `.env` file in the root directory and add the necessary environment variables, such as database connection details.

4. **Run the application**:
   ```
   npm start
   ```

5. **Access the application**:
   Open your web browser and navigate to `http://localhost:3000` to access the License Manager interface.

## Usage Guidelines

- Use the interface to add new licenses by providing the required details.
- Remove licenses by selecting them from the list and confirming the action.
- Expire licenses as needed to manage access to the software.
- Manage trial periods through the trials section of the application.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.