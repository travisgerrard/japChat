import Header from './Header';
import React from 'react';

const ChatHeaderComponent = ({ email }: { email: string | null }) => {
  return <Header email={email} />;
};

export const ChatHeader = React.memo(ChatHeaderComponent); 