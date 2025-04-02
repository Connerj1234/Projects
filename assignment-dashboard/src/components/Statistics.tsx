'use client';

import { Box, Text, Flex } from '@chakra-ui/react';
import useStore from '@/store/useStore';

export function Statistics() {
  const { assignments, semesters, filterOptions } = useStore();

  const now = new Date();
  let filteredAssignments = assignments;

  // Filter by selected semester
  if (filterOptions.selectedSemester) {
    filteredAssignments = filteredAssignments.filter(
      (a) => a.semester === filterOptions.selectedSemester
    );
  }

  // Apply time frame filtering
  if (filterOptions.timeFrame === 'day') {
    filteredAssignments = filteredAssignments.filter((a) => {
      const due = new Date(a.dueDate);
      return (
        due.getDate() === now.getDate() &&
        due.getMonth() === now.getMonth() &&
        due.getFullYear() === now.getFullYear()
      );
    });
  } else if (filterOptions.timeFrame === 'week') {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    filteredAssignments = filteredAssignments.filter((a) => {
      const due = new Date(a.dueDate);
      return due >= startOfWeek && due <= endOfWeek;
    });
  } else if (filterOptions.timeFrame === 'semester') {
    const currentSemester = semesters.find(s => s.id === filterOptions.selectedSemester);
    if (currentSemester?.endDate) {
      const semesterEnd = new Date(currentSemester.endDate);
      filteredAssignments = filteredAssignments.filter((a) => {
        const due = new Date(a.dueDate);
        return due <= semesterEnd;
      });
    }
  }

  // Count totals from filtered list
  const total = filteredAssignments.length;
  const completed = filteredAssignments.filter((a) => a.completed).length;
  const pending = total - completed;

  return (
    <Flex direction="column" mb={4}>
      <Flex justify="space-between" align="center">
        <Box
          p={4}
          borderWidth="1px"
          borderRadius="md"
          borderColor="gray.200"
          bg="white"
          shadow="md"
          flex="1"
          mr={2}
        >
          <Text fontSize="lg" fontWeight="bold">Total Assignments</Text>
          <Text fontSize="2xl" color="gray.800">{total}</Text>
        </Box>
        <Box
          p={4}
          borderWidth="1px"
          borderRadius="md"
          borderColor="gray.200"
          bg="white"
          shadow="md"
          flex="1"
          mx={2}
        >
          <Text fontSize="lg" fontWeight="bold">Completed</Text>
          <Text fontSize="2xl" color="green.500">{completed}</Text>
        </Box>
        <Box
          p={4}
          borderWidth="1px"
          borderRadius="md"
          borderColor="gray.200"
          bg="white"
          shadow="md"
          flex="1"
          ml={2}
        >
          <Text fontSize="lg" fontWeight="bold">Pending</Text>
          <Text fontSize="2xl" color="red.500">{pending}</Text>
        </Box>
      </Flex>
    </Flex>
  );
}
