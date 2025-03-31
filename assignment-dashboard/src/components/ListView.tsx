import {
  Box,
  VStack,
  Text,
  Checkbox,
  HStack,
  useColorModeValue,
  Badge,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import useStore from '@/store/useStore';

export function ListView() {
  const {
    assignments,
    classes,
    assignmentTypes,
    toggleAssignmentCompletion,
    filterOptions,
  } = useStore();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const secondaryTextColor = useColorModeValue('gray.600', 'whiteAlpha.700');

  const filteredAssignments = assignments
    .filter((a) => {
      if (filterOptions.hideCompleted && a.completed) return false;
      if (filterOptions.selectedSemester && a.semester !== filterOptions.selectedSemester)
        return false;
      if (
        filterOptions.selectedClasses &&
        filterOptions.selectedClasses.length > 0 &&
        !filterOptions.selectedClasses.includes(a.classId)
      )
        return false;
      return true;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <VStack spacing={4} align="stretch" w="100%" p={4}>
      {filteredAssignments.map((assignment) => {
        const assignmentClass = classes.find((c) => c.id === assignment.classId);
        const assignmentType = assignmentTypes.find((t) => t.id === assignment.typeId);

        return (
          <Box
            key={assignment.id}
            p={4}
            borderRadius="md"
            bg={bgColor}
            borderLeft="4px solid"
            borderLeftColor={assignmentClass?.color || 'blue.500'}
            boxShadow="sm"
            borderColor={borderColor}
          >
            <HStack justify="space-between" align="flex-start">
              <VStack align="flex-start" spacing={1}>
                <HStack spacing={2}>
                  <Text
                    fontSize="lg"
                    fontWeight="semibold"
                    color={textColor}
                    textDecoration={assignment.completed ? 'line-through' : 'none'}
                  >
                    {assignment.title}
                  </Text>
                  <Badge
                    colorScheme={assignmentType?.color || 'blue'}
                    variant="solid"
                    fontSize="xs"
                  >
                    {assignmentType?.name}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color={secondaryTextColor}>
                  {assignmentClass?.name} • Due {format(new Date(assignment.dueDate), 'PPp')}
                </Text>
                {assignment.description && (
                  <Text fontSize="sm" color={secondaryTextColor} mt={2}>
                    {assignment.description}
                  </Text>
                )}
              </VStack>
              <Checkbox
                isChecked={assignment.completed}
                onChange={() => toggleAssignmentCompletion(assignment.id)}
                colorScheme={assignmentClass?.color?.replace(/\.500$/, '') || 'blue'}
              />
            </HStack>
          </Box>
        );
      })}
      {filteredAssignments.length === 0 && (
        <Box
          p={4}
          borderRadius="md"
          bg={bgColor}
          borderColor={borderColor}
          borderWidth={1}
          textAlign="center"
        >
          <Text color={textColor}>No assignments found</Text>
        </Box>
      )}
    </VStack>
  );
}
