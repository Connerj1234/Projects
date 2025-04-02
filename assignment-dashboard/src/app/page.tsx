'use client';

import {
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Text,
  IconButton,
  Button,
  Switch,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { BsList, BsCalendar3 } from 'react-icons/bs';
import { ViewIcon } from '@chakra-ui/icons';

import {
    BsGear,
    BsTag,
    BsFileEarmarkText,
    BsCheckCircle,
    BsClock,
  } from 'react-icons/bs';

import Header from '@/app/components/Header';
import { Statistics } from '@/components/Statistics';
import { AssignmentList } from '@/components/AssignmentList';
import { CalendarView } from '@/components/CalendarView';
import { FilterControls } from '@/components/FilterControls';
import { EditClassModal } from '@/components/EditClassModal';
import { EditTypeModal } from '@/components/EditTypeModal';

import useStore from '@/store/useStore';
import { useEffect, useState } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const {
    viewMode,
    setViewMode,
    showCompleted,
    setShowCompleted,
  } = useStore();

  const {
    isOpen: isManageClassesOpen,
    onOpen: onOpenManageClasses,
    onClose: onCloseManageClasses,
  } = useDisclosure();

  const {
    isOpen: isManageTypesOpen,
    onOpen: onOpenManageTypes,
    onClose: onCloseManageTypes,
  } = useDisclosure();

  const textColor = useColorModeValue('gray.800', 'white');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Header />

      {/* Control Row: View + Completed + Manage */}
      <Container maxW="container.xl" pt={6} pb={2}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
  {/* Left: View + Show Completed */}
  <HStack spacing={6}>
    {/* View toggle */}
    <HStack spacing={3}>
      <Text fontWeight="medium">View:</Text>
      <IconButton
        icon={<BsList />}
        aria-label="List view"
        onClick={() => setViewMode('list')}
        isActive={viewMode === 'list'}
        colorScheme={viewMode === 'list' ? 'blue' : 'gray'}
        variant="ghost"
        size="sm"
      />
      <IconButton
        icon={<BsCalendar3 />}
        aria-label="Calendar view"
        onClick={() => setViewMode('calendar')}
        isActive={viewMode === 'calendar'}
        colorScheme={viewMode === 'calendar' ? 'blue' : 'gray'}
        variant="ghost"
        size="sm"
      />
    </HStack>

    {/* Show Completed */}
    <HStack spacing={3}>
      <Text fontWeight="medium">Show Completed</Text>
      <Switch
        isChecked={showCompleted}
        onChange={(e) => setShowCompleted(e.target.checked)}
      />
    </HStack>
  </HStack>

  {/* Right: Manage buttons */}
  <HStack spacing={3}>
  <Button
  variant="outline"
  leftIcon={<BsGear />}
  onClick={onOpenManageClasses}
>
  Manage Classes
</Button>

<Button
  variant="outline"
  leftIcon={<BsTag />}
  onClick={onOpenManageTypes}
>
  Manage Types
</Button>
  </HStack>
</Flex>

      </Container>

      {/* Statistics */}
      <Container maxW="container.xl" pt={4}>
        <Statistics />
      </Container>

      {/* Assignment Dashboard */}
      <Container maxW="container.xl" py={6}>
        <Box
          bg={useColorModeValue('white', 'gray.800')}
          rounded="lg"
          shadow="base"
          p={6}
        >
          <Flex justify="space-between" align="center" mb={6}>
            <Heading size="lg" color={textColor}>
              Assignment Dashboard
            </Heading>
            <FilterControls />
          </Flex>

          {viewMode === 'list' ? <AssignmentList /> : <CalendarView />}
        </Box>
      </Container>

      {/* Modals */}
      <EditClassModal isOpen={isManageClassesOpen} onClose={onCloseManageClasses} />
      <EditTypeModal isOpen={isManageTypesOpen} onClose={onCloseManageTypes} />
    </Box>
  );
}
