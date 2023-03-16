import React from 'react';

import ButtonBright from '../ButtonBright';

const AccountNav = () => {
  const [showLogin, setShowLogin] = React.useState(false);
  console.log(showLogin);
  return (
    <div>
      <ButtonBright
        title="Connect Wallet"
        onClick={() => {
          setShowLogin(true);
        }}
      />
    </div>
  );
};

export default AccountNav;
