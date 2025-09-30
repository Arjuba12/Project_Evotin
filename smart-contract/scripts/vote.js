const hre = require("hardhat");

async function main() {
  // ganti dengan alamat kontrak hasil deploy
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.attach(contractAddress);

  // tambah kandidat
  await voting.addCandidate("Alice");
  await voting.addCandidate("Bob");

  // vote untuk kandidat 0 (Alice)
  await voting.vote(0);

  // cek jumlah suara
  const votesAlice = await voting.getVotes(0);
  const votesBob = await voting.getVotes(1);
  console.log("Alice votes:", votesAlice.toString());
  console.log("Bob votes:", votesBob.toString());

  // cek daftar kandidat
  const candidates = await voting.getCandidates();
  console.log("Candidates:", candidates);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
