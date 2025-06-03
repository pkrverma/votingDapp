const hre = require("hardhat");

async function main() {
    await hre.run('compile'); // Ensure the contracts are compiled

    // Get the ContractFactory for VotingContract (using exact contract name from .sol)
    // For ethers.js v5, use the exact contract name as it appears in the Solidity file
    const VotingContractFactory = await hre.ethers.getContractFactory("votingContract"); // <--- Ensure this matches your contract name case

    // Deploy the contract without any constructor arguments
    const votingContract = await VotingContractFactory.deploy();

    // Await the deployment using .deployed() for ethers.js v5
    await votingContract.deployed(); // <--- CHANGE for ethers.js v5

    // Log the address where the contract was deployed
    // For ethers.js v5, it's .address
    console.log("Blockchain Voting contract deployed to address:", votingContract.address); // <--- CHANGE for ethers.js v5

    // --- OPTIONAL: Create an initial election immediately after deployment ---
    console.log("\nAttempting to create an initial election...");

    // Example election details
    const electionName = "2025 Community Election";
    const startTime = Math.floor(Date.now() / 1000) + (60 * 60); // Starts in 1 hour from deployment
    const endTime = startTime + (60 * 60 * 24 * 7); // Ends 7 days after start

    try {
        // Interact with the contract (ethers.js v5)
        const createElectionTx = await votingContract.createElection(
            electionName,
            startTime,
            endTime
        );
        await createElectionTx.wait();
        console.log(`Successfully created initial election "${electionName}" with ID 1.`);
        console.log(`Start Time: ${new Date(startTime * 1000).toLocaleString()}`);
        console.log(`End Time: ${new Date(endTime * 1000).toLocaleString()}`);
    } catch (error) {
        console.error("Failed to create initial election:", error.message);
        console.error("Please ensure your contract is correct and your wallet has enough funds.");
    }
    // --- END OPTIONAL SECTION ---
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});