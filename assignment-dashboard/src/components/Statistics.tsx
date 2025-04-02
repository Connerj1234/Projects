import { Box, Text, Flex } from '@chakra-ui/react'; // Removed Select import
import useStore from '@/store/useStore';
import { useState } from 'react';

interface StatisticsProps {
  semester: string; // Add semester prop
}

export function Statistics({ semester }: StatisticsProps) {
  const { assignments, semesters } = useStore();
  const [timeFrame, setTimeFrame] = useState('semester'); // Default to semester

  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.completed).length;
  const pendingAssignments = totalAssignments - completedAssignments;

  // Filter assignments based on the selected time frame
  const filteredAssignments = assignments.filter(assignment => {
    const dueDate = new Date(assignment.dueDate);
    const today = new Date();

    if (timeFrame === 'day') {
      return dueDate.toDateString() === today.toDateString();
    } else if (timeFrame === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date();
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
      return dueDate >= startOfWeek && dueDate <= endOfWeek;
    } else if (timeFrame === 'semester') {
      const currentSemester = semesters.find(s => s.id === semester);
      return currentSemester && dueDate <= new Date(currentSemester.endDate);
    }
    return true; // Default case
  });

  const filteredCompleted = filteredAssignments.filter(a => a.completed).length;
  const filteredPending = filteredAssignments.length - filteredCompleted;

  return (
    <Flex direction="column" mb={4}>
      {/* Removed the Select dropdown */}
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
          <Text fontSize="2xl" color="gray.800">{filteredAssignments.length}</Text>
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
          <Text fontSize="2xl" color="green.500">{filteredCompleted}</Text>
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
          <Text fontSize="2xl" color="red.500">{filteredPending}</Text>
        </Box>
      </Flex>
    </Flex>
  );
}
