export const LiquidityBar = ({ localAmount, remoteAmount }) => {
  const totalAmount = localAmount + remoteAmount;
  const localAmountPercentage = (localAmount / totalAmount) * 100;
  const remoteAmountPercentage = (remoteAmount / totalAmount) * 100;

  return (
    <div className="w-full h-6 bg-gray-300 rounded-full overflow-hidden relative">
      <div
        className="h-full bg-purple transition-all duration-300 ease-in-out"
        style={{ width: `${localAmountPercentage}%` }}
        title={`Local: ${localAmount.toFixed(2)} (${localAmountPercentage.toFixed(0)}%)`}
      ></div>
      <div
        className="h-full bg-cyan transition-all duration-300 ease-in-out"
        style={{ width: `${remoteAmountPercentage}%`, position: 'absolute', right: '0' }}
        title={`Remote: ${remoteAmount.toFixed(2)} (${remoteAmountPercentage.toFixed(0)}%)`}
      ></div>
    </div>
  );
};
