'use client';

import {
  Box,
  Flex,
  Select,
  Button,
  IconButton,
  HStack,
  useDisclosure,
  useColorModeValue,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useColorMode } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import useStore from '@/store/useStore';
import { SemesterModal } from '@/components/SemesterModal';
import { NewAssignmentModal } from '@/components/NewAssignmentModal';

export default function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const {
    semesters,
    filterOptions,
    setFilterOptions,
  } = useStore();

  // Modal control
  const {
    isOpen: isSemesterModalOpen,
    onOpen: onOpenManageSemesters,
    onClose: onCloseManageSemesters,
  } = useDisclosure();

  const {
    isOpen: isNewAssignmentOpen,
    onOpen: onOpenNewAssignment,
    onClose: onCloseNewAssignment,
  } = useDisclosure();

  const [selectedSemesterId, setSelectedSemesterId] = useState<string | undefined>(undefined);

useEffect(() => {
  if (!selectedSemesterId && semesters.length > 0) {
    setSelectedSemesterId(filterOptions.selectedSemester || semesters[0].id);
  }
}, [semesters, filterOptions.selectedSemester]);

useEffect(() => {
  if (selectedSemesterId) {
    setFilterOptions((prev) => ({
      ...prev,
      selectedSemester: selectedSemesterId,
    }));
  }
}, [selectedSemesterId, setFilterOptions]);


  useEffect(() => {
    if (selectedSemesterId) {
      setFilterOptions((prev) => ({
        ...prev,
        selectedSemester: selectedSemesterId,
      }));
    }
  }, [selectedSemesterId, setFilterOptions]);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');

  return (
    <Box
      borderBottom="1px"
      borderColor={borderColor}
      bg={bg}
      px={6}
      py={3}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <HStack spacing={3}>
          {/* Semester dropdown */}
          <Select
  value={selectedSemesterId || ''}
  onChange={(e) => setSelectedSemesterId(e.target.value)}
  size="sm"
  maxW="170px"
  borderRadius="md"
  border="1px solid"
  borderColor="gray.300"
  fontWeight="medium"
  color="gray.800"
  bg="white"
  _hover={{ borderColor: 'gray.400' }}
  _focus={{ borderColor: 'blue.500', boxShadow: 'sm' }}
  placeholder="Select semester"
>
  {semesters.map((s) => (
    <option key={s.id} value={s.id}>
      {s.name}
    </option>
  ))}
</Select>



<Button
  onClick={onOpenManageSemesters}
  size="sm"
  variant="outline"
  fontWeight="medium"
  px={4}
  borderRadius="md"
>
  + Manage Semesters
</Button>

        </HStack>

        <HStack spacing={3}>
          {/* View toggles + show completed could go here if needed */}

          <Button colorScheme="blue" size="sm" onClick={onOpenNewAssignment}>
            New Assignment
          </Button>

          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            size="sm"
          />
        </HStack>
      </Flex>

      {/* Modals */}
      <SemesterModal isOpen={isSemesterModalOpen} onClose={onCloseManageSemesters} />
      <NewAssignmentModal isOpen={isNewAssignmentOpen} onClose={onCloseNewAssignment} />
    </Box>
  );
}
