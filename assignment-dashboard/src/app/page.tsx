'use client';

import { useState, useEffect } from 'react';
import { Box, Container, Flex, Heading, useColorModeValue } from '@chakra-ui/react';
import { Header } from '@/app/components/Header';
import ViewControls from '@/app/components/ViewControls';
import { AssignmentList } from '@/components/AssignmentList';
import { CalendarView } from '@/components/CalendarView';
import useStore from '@/store/useStore';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const viewMode = useStore((state) => state.viewMode);
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.900', 'white');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on the server side
  if (!mounted) return null;

  return (
    <Box as="div" minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Header />
      <ViewControls />
      <Container maxW="container.xl" py={8}>
        <Box bg={bgColor} rounded="lg" shadow="base" p={6}>
          <Heading size="lg" color={textColor} fontWeight="bold" mb={6}>
            Assignment Dashboard
          </Heading>
          {viewMode === 'list' ? <AssignmentList /> : <CalendarView />}
        </Box>
      </Container>
    </Box>
  );
}
