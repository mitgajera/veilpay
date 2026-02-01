# VeilPay Frontend

The official React + Vite + Tailwind user interface for the VeilPay privacy protocol.

## Features

- **Matrix Theme**: A custom HTML5 Canvas-based "Digital Rain" background using the `MatrixRain` component.
- **Encrypted State Management**: Handles the client-side encryption of balances and transfer amounts before submitting to the chain.
- **Wallet Integration**: Seamless connection with Phantom, Solflare, and other Solana wallets via `@solana/wallet-adapter`.
- **Glassmorphism UI**: A polished, translucent design system using Tailwind CSS utility classes.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 3.4
- **Blockchain Interaction**:
    - `@solana/web3.js`
    - `@coral-xyz/anchor`
    - `@solana/wallet-adapter-react`

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## Key Components

- `Layout.tsx`: Handles the app shell, wallet connection providers, and the `MatrixRain` background.
- `Dashboard.tsx`: The main view for checking private balances and initiating transfers.
- `TransferModal.tsx`: A secure, styled modal for inputting recipient addresses and amounts privately.
- `MatrixRain.tsx`: A high-performance canvas animation for the background effect.