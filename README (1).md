
# Network Testing Main

This project provides a simple framework for network testing. It includes basic functionalities for server-client communication and web interface rendering.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/lpradovera/network-testing.git
    ```
2. Navigate to the project directory:
    ```sh
    cd network-testing-main
    ```
3. Install the dependencies:
    ```sh
    npm install
    ```

## Usage

1. Start the server:
    ```sh
    npm start
    ```
2. Open your web browser and go to `http://localhost:3000` to see the application in action.

## Environment Variables

Create a `.env` file in the root directory of your project and add the following environment variables:

```
SIGNALWIRE_PROJECT_KEY=649dc08e-355
SIGNALWIRE_TOKEN=PTdaf6a2203f03e
SIGNALWIRE_SPACE=EXAMPLE.signalwire.com
```

These variables are necessary for configuring the SignalWire API used in the project.

## Project Structure

```
network-testing-main/
├── public/
│   └── client.js
├── views/
│   └── index.ejs
├── .gitignore
├── captain-definition
├── index.js
├── package-lock.json
├── package.json
└── README.md
```

- `public/client.js`: Client-side JavaScript file.
- `views/index.ejs`: Server-side template for rendering the main page.
- `.gitignore`: Git ignore file.
- `captain-definition`: Deployment configuration file.
- `index.js`: Main server-side JavaScript file.
- `package-lock.json`: Automatically generated file for locking the dependencies.
- `package.json`: Contains the metadata for the project and dependencies.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.
