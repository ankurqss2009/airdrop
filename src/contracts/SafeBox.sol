// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import 'OpenZeppelin/openzeppelin-contracts@3.4.0/contracts/proxy/Initializable.sol';

import 'OpenZeppelin/openzeppelin-contracts@3.4.0/contracts/token/ERC20/ERC20.sol';
import 'OpenZeppelin/openzeppelin-contracts@3.4.0/contracts/token/ERC20/IERC20.sol';
import 'OpenZeppelin/openzeppelin-contracts@3.4.0/contracts/token/ERC20/SafeERC20.sol';
import 'OpenZeppelin/openzeppelin-contracts@3.4.0/contracts/cryptography/MerkleProof.sol';
import 'OpenZeppelin/openzeppelin-contracts@3.4.0/contracts/math/SafeMath.sol';
import 'OpenZeppelin/openzeppelin-contracts@3.4.0/contracts/utils/ReentrancyGuard.sol';
//import './Governable.sol';
//import '../interfaces/ICErc20.sol';

interface ICErc20 {
    function decimals() external returns (uint8);

    function underlying() external returns (address);

    function mint(uint mintAmount) external returns (uint);

    function redeem(uint redeemTokens) external returns (uint);

    function balanceOf(address user) external view returns (uint);

    function borrowBalanceCurrent(address account) external returns (uint);

    function borrowBalanceStored(address account) external view returns (uint);

    function borrow(uint borrowAmount) external returns (uint);

    function repayBorrow(uint repayAmount) external returns (uint);
}

contract Governable is Initializable {
    event SetGovernor(address governor);
    event SetPendingGovernor(address pendingGovernor);
    event AcceptGovernor(address governor);

    address public governor; // The current governor.
    address public pendingGovernor; // The address pending to become the governor once accepted.

    bytes32[64] _gap; // reserve space for upgrade

    modifier onlyGov() {
        require(msg.sender == governor, 'not the governor');
        _;
    }

    /// @dev Initialize using msg.sender as the first governor.
    function __Governable__init() internal initializer {
        governor = msg.sender;
        pendingGovernor = address(0);
        emit SetGovernor(msg.sender);
    }

    /// @dev Set the pending governor, which will be the governor once accepted.
    /// @param _pendingGovernor The address to become the pending governor.
    function setPendingGovernor(address _pendingGovernor) external onlyGov {
        pendingGovernor = _pendingGovernor;
        emit SetPendingGovernor(_pendingGovernor);
    }

    /// @dev Accept to become the new governor. Must be called by the pending governor.
    function acceptGovernor() external {
        require(msg.sender == pendingGovernor, 'not the pending governor');
        pendingGovernor = address(0);
        governor = msg.sender;
        emit AcceptGovernor(msg.sender);
    }
}

contract SafeBox is Governable, ERC20, ReentrancyGuard {
    using SafeMath for uint;
    using SafeERC20 for IERC20;
    event Claim(address user, uint amount);

    ICErc20 public immutable cToken;
    IERC20 public immutable uToken;

    address public relayer;
    bytes32 public root;
    mapping(address => uint) public claimed;

    constructor(
        ICErc20 _cToken,
        string memory _name,
        string memory _symbol
    ) public ERC20(_name, _symbol) {
        _setupDecimals(_cToken.decimals());
        IERC20 _uToken = IERC20(_cToken.underlying());
        __Governable__init();
        cToken = _cToken;
        uToken = _uToken;
        relayer = msg.sender;
        _uToken.safeApprove(address(_cToken), uint(-1));
    }

    function setRelayer(address _relayer) external onlyGov {
        relayer = _relayer;
    }

    function updateRoot(bytes32 _root) external {
        require(msg.sender == relayer || msg.sender == governor, '!relayer');
        root = _root;
    }

    function deposit(uint amount) external nonReentrant {
        uint uBalanceBefore = uToken.balanceOf(address(this));
        uToken.safeTransferFrom(msg.sender, address(this), amount);
        uint uBalanceAfter = uToken.balanceOf(address(this));
        uint cBalanceBefore = cToken.balanceOf(address(this));
        require(cToken.mint(uBalanceAfter.sub(uBalanceBefore)) == 0, '!mint');
        uint cBalanceAfter = cToken.balanceOf(address(this));
        _mint(msg.sender, cBalanceAfter.sub(cBalanceBefore));
    }

    function withdraw(uint amount) public nonReentrant {
        _burn(msg.sender, amount);
        uint uBalanceBefore = uToken.balanceOf(address(this));
        require(cToken.redeem(amount) == 0, '!redeem');
        uint uBalanceAfter = uToken.balanceOf(address(this));
        uToken.safeTransfer(msg.sender, uBalanceAfter.sub(uBalanceBefore));
    }

    function claim(uint totalAmount, bytes32[] memory proof) public nonReentrant {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, totalAmount));
        require(MerkleProof.verify(proof, root, leaf), '!proof');
        uint send = totalAmount.sub(claimed[msg.sender]);
        claimed[msg.sender] = totalAmount;
        uToken.safeTransfer(msg.sender, send);
        emit Claim(msg.sender, send);
    }

    function adminClaim(uint amount) external onlyGov {
        uToken.safeTransfer(msg.sender, amount);
    }

    function claimAndWithdraw(
        uint totalAmount,
        bytes32[] memory proof,
        uint withdrawAmount
    ) external {
        claim(totalAmount, proof);
        withdraw(withdrawAmount);
    }
}