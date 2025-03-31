'use client';

import { Suspense } from 'react';
import { ChakraProvider } from '@chakra-ui/react';

export function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChakraProvider>
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </ChakraProvider>
  );
}
