import { useNavigate } from 'react-router-dom';
import { TRADE_PATH } from '../../app/router/paths';

export const Step3 = ({ paymentStatus }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center">
      {paymentStatus === 'success' ? (
        <>
          <h3 className="text-2xl font-semibold mb-4">Payment Completed!</h3>
          <p>Your payment has been received and the channel is coming.</p>
        </>
      ) : (
        <>
          <h3 className="text-2xl font-semibold mb-4">Payment Failed</h3>
          <p>There was an issue with your payment. Please try again.</p>
        </>
      )}
      <button className="px-6 py-3 rounded border text-lg font-bold border-purple mt-6" onClick={() => navigate(TRADE_PATH)}>
        Finish
      </button>
    </div>
  );
};
