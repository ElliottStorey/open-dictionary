# Open Dictionary

A dictionary API service that provides definitions, usage, etymologies, pronunciations, and translations.

## Getting Started

### Installation

Clone the repository:

```shell
git clone https://github.com/ElliottStorey/open-dictionary.git
cd open-dictionary
```

Install dependencies:

```shell
npm install
```

Set up environment variables by copying the example file:

```shell
cp .env.example .env
```

### Usage

Start the development server:

```shell
npm run dev
```

For production:

```shell
npm start
```

The API will be available at the configured port (default: http://localhost:3000).

## Docker

Build and run with Docker:

```shell
docker build -t open-dictionary .
docker run -p 3000:3000 open-dictionary
```
