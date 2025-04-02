'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';

import Header from '@/app/components/Header';
import { AssignmentList } from '@/components/AssignmentList';
import { CalendarView } from '@/components/CalendarView';
import { Statistics } from '@/components/Statistics';
import { FilterControls } from '@/components/FilterControls';
import { HStack } from '@chakra-ui/react';
import useStore from '@/store/useStore';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const viewMode = useStore((state) => state.viewMode);

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.900', 'white');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Header />

      {/* Statistics section - separated from card layout */}
      <Container maxW="container.xl" pt={6} pb={2}>
        <Statistics />
      </Container>

      {/* Dashboard container */}
      <Container maxW="container.xl" py={6}>
        <Box bg={bgColor} rounded="lg" shadow="base" p={6}>
        <Flex justify="space-between" align="center" mb={6}>
  <HStack spacing={4}>
    <Heading size="lg" color={textColor} fontWeight="bold">
      Assignment Dashboard
    </Heading>
    <FilterControls />
  </HStack>
</Flex>


          {viewMode === 'list' ? <AssignmentList /> : <CalendarView />}
        </Box>
      </Container>
    </Box>
  );
}
