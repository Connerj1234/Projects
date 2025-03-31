'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Select,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import useStore from '@/store/useStore';
import { NewAssignmentModal } from './NewAssignmentModal';

export function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] = useState(false);
  const {
    viewMode,
    setViewMode,
    filterOptions,
    setFilterOptions,
    semesters,
  } = useStore();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      py={4}
      px={8}
      borderBottomWidth="1px"
      borderColor={borderColor}
      bg={bgColor}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justify="space-between" align="center">
        <Flex gap={4} align="center">
          <Select
            w="150px"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'list' | 'calendar')}
          >
            <option value="list">List View</option>
            <option value="calendar">Calendar View</option>
          </Select>

          <Select
            w="200px"
            value={filterOptions.selectedSemester}
            onChange={(e) =>
              setFilterOptions({ selectedSemester: e.target.value })
            }
          >
            <option value="">All Semesters</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </Select>
        </Flex>

        <Flex gap={4} align="center">
          <Button
            colorScheme="blue"
            size="sm"
            onClick={() => setIsNewAssignmentModalOpen(true)}
          >
            New Assignment
          </Button>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
          />
        </Flex>
      </Flex>

      <NewAssignmentModal
        isOpen={isNewAssignmentModalOpen}
        onClose={() => setIsNewAssignmentModalOpen(false)}
      />
    </Box>
  );
}
