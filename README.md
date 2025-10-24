# 🔒 Blockchain-Secured Peer Review System for Academic Papers

Welcome to a revolutionary decentralized platform for academic peer review! This Web3 project tackles real-world issues in academia, such as authorship disputes, plagiarism, biased centralized reviews, and lack of transparency. By leveraging the Stacks blockchain and Clarity smart contracts, it ensures immutable records of submissions, automated plagiarism detection, fair peer reviews, and verifiable authorship integrity. Researchers can submit papers, undergo transparent reviews, and publish with blockchain-backed proofs—empowering open science while reducing fraud.

## ✨ Features

📄 Secure paper submission with content hashing for authorship proof  
🕵️‍♂️ Automated plagiarism detection using on-chain hash comparisons  
👥 Decentralized reviewer assignment and anonymous reviews  
🗳️ Consensus-based approval voting for paper acceptance  
⏰ Immutable timestamps for all actions to prevent disputes  
💰 Token rewards for honest reviewers and authors  
🔍 Publicly verifiable review history and publication registry  
🚫 Anti-collusion mechanisms to ensure review integrity  
📊 Analytics for paper impact and reviewer reputation  

## 🛠 How It Works

This system is built on the Stacks blockchain using Clarity smart contracts. It involves 8 interconnected smart contracts to handle different aspects of the peer review lifecycle, ensuring modularity, security, and scalability. Off-chain components (e.g., IPFS for full paper storage) complement the on-chain logic, with only hashes and metadata stored on-chain for efficiency.

### Smart Contracts Overview
1. **UserRegistry.clar**: Manages user registrations (authors, reviewers). Stores profiles, verifies identities via STX addresses, and tracks reputation scores based on participation.
2. **PaperSubmission.clar**: Handles paper uploads. Authors submit a SHA-256 hash of the paper, title, abstract, and metadata. Generates an immutable timestamp for authorship proof.
3. **PlagiarismDetector.clar**: Compares new submission hashes against existing ones using similarity algorithms (e.g., via on-chain fuzzy matching or oracle integration). Flags potential plagiarism and prevents duplicate registrations.
4. **ReviewerAssignment.clar**: Randomly assigns qualified reviewers to papers based on expertise tags and reputation. Ensures anonymity and prevents self-assignment.
5. **ReviewSubmission.clar**: Allows assigned reviewers to submit encrypted reviews (decrypted post-consensus). Includes ratings, comments, and plagiarism flags.
6. **ConsensusVoting.clar**: Facilitates voting on paper acceptance/rejection. Uses a threshold-based consensus (e.g., majority vote) among reviewers, with anti-collusion checks like stake requirements.
7. **RewardToken.clar**: An SIP-010 compliant fungible token contract for distributing rewards. Authors stake tokens for submission; reviewers earn for quality reviews; penalties for malicious behavior.
8. **PublicationRegistry.clar**: Registers accepted papers as "published" with final hashes, DOIs (if integrated), and links to off-chain storage. Provides query functions for verification.

### For Authors
- Register your profile via UserRegistry.
- Generate a SHA-256 hash of your paper (store full content on IPFS).
- Call PaperSubmission's `submit-paper` function with hash, title, abstract, and stake tokens.
- The PlagiarismDetector automatically checks for matches—if clear, it's queued for review.
- Await reviewer assignment and consensus. If accepted, it's registered in PublicationRegistry for eternal proof.

Boom! Your paper is now blockchain-verified, with authorship timestamped and plagiarism-free.

### For Reviewers
- Register and build reputation in UserRegistry.
- Get assigned via ReviewerAssignment (based on your expertise).
- Submit detailed reviews using ReviewSubmission.
- Vote in ConsensusVoting—earn rewards from RewardToken for constructive input.
- Verify everything on-chain for transparency.

Instant, fair, and rewarding participation!

### For Verifiers/Public
- Use PublicationRegistry's `get-paper-details` to view submission info, reviews, and timestamps.
- Call PlagiarismDetector's `verify-originality` for any paper hash.
- Query UserRegistry for reviewer reputations to assess credibility.

That's it! A tamper-proof system fostering trust in academic research.