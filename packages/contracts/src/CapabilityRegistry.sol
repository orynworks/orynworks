// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CapabilityRegistry {
    enum CapType { Skill, Knowledge }
    enum Status { Active, Deprecated }

    struct Capability {
        bytes32 slug;
        address builder;
        uint256 priceUSDC;
        CapType capType;
        Status status;
        bytes32 metadataHash;
        uint256 createdAt;
    }

    mapping(bytes32 => Capability) public capabilities;
    address public owner;

    event CapabilityRegistered(bytes32 indexed slug, address indexed builder, CapType capType, uint256 priceUSDC);
    event CapabilityUpdated(bytes32 indexed slug, uint256 priceUSDC, bytes32 metadataHash);
    event CapabilityDeprecated(bytes32 indexed slug);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    error AlreadyRegistered();
    error NotBuilder();
    error NotFound();
    error NotOwner();
    error InvalidSlug();

    constructor(address _owner) {
        require(_owner != address(0), "owner zero");
        owner = _owner;
    }

    modifier onlyBuilder(bytes32 slug) {
        if (capabilities[slug].builder != msg.sender) revert NotBuilder();
        _;
    }

    function register(
        bytes32 slug,
        uint256 priceUSDC,
        CapType capType,
        bytes32 metadataHash
    ) external {
        if (slug == bytes32(0)) revert InvalidSlug();
        if (capabilities[slug].builder != address(0)) revert AlreadyRegistered();

        capabilities[slug] = Capability({
            slug: slug,
            builder: msg.sender,
            priceUSDC: priceUSDC,
            capType: capType,
            status: Status.Active,
            metadataHash: metadataHash,
            createdAt: block.timestamp
        });
        emit CapabilityRegistered(slug, msg.sender, capType, priceUSDC);
    }

    function update(bytes32 slug, uint256 priceUSDC, bytes32 metadataHash) external onlyBuilder(slug) {
        capabilities[slug].priceUSDC = priceUSDC;
        capabilities[slug].metadataHash = metadataHash;
        emit CapabilityUpdated(slug, priceUSDC, metadataHash);
    }

    function deprecate(bytes32 slug) external onlyBuilder(slug) {
        capabilities[slug].status = Status.Deprecated;
        emit CapabilityDeprecated(slug);
    }

    function getCapability(bytes32 slug) external view returns (Capability memory) {
        Capability memory cap = capabilities[slug];
        if (cap.builder == address(0)) revert NotFound();
        return cap;
    }

    function setOwner(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        require(newOwner != address(0), "owner zero");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerUpdated(oldOwner, newOwner);
    }
}
