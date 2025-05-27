const hre = require("hardhat");

async function main() {
    await hre.run('compile'); // Ensure the contracts are compiled

    const VotingDapp = await hre.ethers.getContractFactory("votingContract");
    const votingDapp = await VotingDapp.deploy("2024 Presidential Election"); // Pass required argument

    await votingDapp.deployed();
    console.log("Blockchain Voting contract deployed to:", votingDapp.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
