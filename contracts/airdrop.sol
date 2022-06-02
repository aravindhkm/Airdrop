// SPDX-License-Identifier: MITs

pragma solidity 0.8.13;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract AirDrop is Ownable,ReentrancyGuard,Pausable,EIP712,AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address payable;
    using Counters for Counters.Counter;

    IERC20 public token;
    bytes32 public root;
    bytes32 private constant _PERMIT_TYPEHASH = keccak256("Permit(address user,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 private _PERMIT_TYPEHASH_DEPRECATED_SLOT;
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    bool public isPermitClaimable;
    bool public isRootClaimable;

    mapping(address => Counters.Counter) private _nonces;
    mapping(address => bool) public permitClaim;
    mapping(address => bool) public rootClaim;

    constructor(address _token) EIP712("AirDrop", "1") {
        token = IERC20(_token);
        
        isPermitClaimable = true;
        isRootClaimable = true;

        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(SIGNER_ROLE, ADMIN_ROLE);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(SIGNER_ROLE, msg.sender);
    }

    receive() external payable {}

    /**
     * @dev Triggers stopped state.
     * 
     * Can only be called by the current owner.
     * 
     * Requirements:
     *
     * - The contract must not be paused.
    */
    function pause() public onlyOwner{
      _pause();
    }
    
    /**
     * @dev Triggers normal state.
     * 
     * Can only be called by the current owner.
     * 
     * Requirements:
     *
     * - The contract must not be unpaused.
     */
    function unpause() public onlyOwner{
      _unpause();
    }

    function recoverLeftOverBNB(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
    }

    function recoverLeftOverToken(address tokenAddr,uint256 amount) external onlyOwner {
        IERC20(tokenAddr).transfer(owner(),amount);
    }

    function setRoot(bytes32 newRoot) external onlyOwner {
        root = newRoot;
    }

    function setToken(address newToken) external onlyOwner {
        token = IERC20(newToken);
    }

    function setRootClaimable(bool status) external onlyOwner {
        isRootClaimable = status;
    }

    function setPermitClaimable(bool status) external onlyOwner {
        isPermitClaimable = status;
    }

    /**
     * @dev See {IERC20Permit-nonces}.
     */
    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner].current();
    }

    /**
     * @dev See {IERC20Permit-DOMAIN_SEPARATOR}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev "Consume a nonce": return the current value and increment.
     *
     * _Available since v4.1._
     */
    function _useNonce(address owner) internal virtual returns (uint256 current) {
        Counters.Counter storage nonce = _nonces[owner];
        current = nonce.current();
        nonce.increment();
    }

    function _leaf(address account, uint256 amount) internal pure returns (bytes32){
        return keccak256(abi.encodePacked(account,amount));
    }

    function _verify(bytes32 leaf, bytes32[] memory proof) internal view returns (bool){
        return MerkleProof.verify(proof, root, leaf);
    }

    function claimWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused {
        require(isPermitClaimable, "Permit Claim is disable");
        require(block.timestamp <= deadline, "Permit: expired deadline");
        require(!permitClaim[_msgSender()], "Already claimed");

        bytes32 structHash = keccak256(abi.encode(_PERMIT_TYPEHASH, _msgSender(), amount, _useNonce(_msgSender()), deadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, v, r, s);
        require(hasRole(SIGNER_ROLE,signer), "Permit: invalid signature");

        permitClaim[_msgSender()] = true;
        token.safeTransfer(_msgSender(),amount);
    }

    function claimWithRoot(
        uint256 amount,
        bytes32[] calldata proof
    ) external whenNotPaused {
        require(isRootClaimable, "Root Claim is disable");
        require(_verify(_leaf(_msgSender(), amount), proof), "Invalid merkle proof");
        require(!rootClaim[_msgSender()], "Already claimed");

        rootClaim[_msgSender()] = true;
        token.safeTransfer(_msgSender(),amount);
    }

}