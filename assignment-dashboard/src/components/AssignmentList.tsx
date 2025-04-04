'use client';

import {
  Box,
  Checkbox,
  Flex,
  Tag,
  Text,
  VStack,
  Heading,
  Divider,
  useColorModeValue,
  IconButton,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { format, differenceInDays } from 'date-fns';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import useStore from '@/store/useStore';
import { useState, useRef } from 'react';
import { EditAssignmentModal } from './EditAssignmentModal';

export function AssignmentList() {
  const {
    assignments,
    classes,
    semesters,
    assignmentTypes,
    filterOptions,
    toggleAssignmentCompletion,
    deleteAssignment,
  } = useStore();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const filteredAssignments = assignments.filter(a => {
    if (!filterOptions.showCompleted && a.completed) return false;
    if (filterOptions.selectedClasses.length > 0 && !filterOptions.selectedClasses.includes(a.classId)) return false;
    if (filterOptions.selectedTypes.length > 0 && !filterOptions.selectedTypes.includes(a.type.id)) return false;

    const dueDate = new Date(a.dueDate);
    const today = new Date();

    if (filterOptions.timeFrame === 'day') {
      return dueDate.toDateString() === today.toDateString();
    } else if (filterOptions.timeFrame === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date();
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
      return dueDate >= startOfWeek && dueDate <= endOfWeek;
    } else if (filterOptions.timeFrame === 'semester') {
      const currentSemester = semesters.find(s => s.id === filterOptions.selectedSemester);
      return currentSemester && currentSemester.endDate && dueDate <= new Date(currentSemester.endDate);
    }

    return true;
  });

  const groupedAssignments = !filterOptions.selectedSemester
    ? semesters.reduce((acc, semester) => {
        const semesterAssignments = filteredAssignments.filter(
          (a) => a.semester === semester.id
        );
        if (semesterAssignments.length > 0) {
          acc[semester.id] = {
            name: semester.name,
            assignments: semesterAssignments,
          };
        }
        return acc;
      }, {} as Record<string, { name: string; assignments: typeof filteredAssignments }>)
    : { all: { name: '', assignments: filteredAssignments } };

  const getDaysLeftText = (dueDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateTime = new Date(dueDate);
    dueDateTime.setHours(0, 0, 0, 0);

    const days = differenceInDays(dueDateTime, today);
    if (days < 0) return 'Past due';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
  };

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const mutedTextColor = useColorModeValue('gray.600', 'whiteAlpha.700');
  const semesterColor = useColorModeValue('blue.600', 'blue.300');

  const handleEditClick = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    onDeleteOpen();
  };

  const handleDelete = () => {
    if (!selectedAssignmentId) return;

    try {
      deleteAssignment(selectedAssignmentId);
      toast({
        title: 'Assignment deleted',
        description: 'Successfully deleted the assignment',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete assignment',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <VStack spacing={6} align="stretch">
        {Object.entries(groupedAssignments).map(([semesterId, { name, assignments }]) => (
          <Box key={semesterId}>
            {!filterOptions.selectedSemester && (
              <>
                <Heading size="md" color={semesterColor} mb={4}>
                  {name}
                </Heading>
                <Divider mb={4} />
              </>
            )}
            <VStack spacing={3} align="stretch">
              {assignments.map((assignment) => {
                const assignmentClass = classes.find((c) => c.id === assignment.classId);
                const assignmentType = assignmentTypes.find((t) => t.id === assignment.type.id);

                return (
                  <Box
                    key={assignment.id}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor={borderColor}
                    bg={bgColor}
                    borderLeft="4px solid"
                    borderLeftColor={assignmentClass?.color || 'blue.500'}
                  >
                    <Flex justify="space-between" align="center">
                      <Flex align="center" gap={3}>
                        <Checkbox
                          isChecked={assignment.completed}
                          onChange={() => toggleAssignmentCompletion(assignment.id)}
                          colorScheme="blue"
                        />
                        <Box>
                          <Text
                            fontSize="lg"
                            fontWeight="medium"
                            color={assignment.completed ? mutedTextColor : textColor}
                            textDecoration={assignment.completed ? 'line-through' : 'none'}
                          >
                            {assignment.title}
                          </Text>
                          <Flex gap={2} mt={1} flexWrap="wrap" align="center">
                            <Tag colorScheme={assignment.completed ? 'green' : 'red'}>
                              {assignment.completed ? 'Completed' : 'Pending'}
                            </Tag>
                            <Tag bg={assignmentClass?.color || 'blue.500'} color="white">
                              {assignmentClass?.name}
                            </Tag>
                            <Tag bg={assignmentType?.color || 'gray.500'} color="white">
                              {assignmentType?.name}
                            </Tag>
                          </Flex>
                          {assignment.description && (
                            <Text mt={2} color={mutedTextColor}>
                              {assignment.description}
                            </Text>
                          )}
                        </Box>
                      </Flex>
                      <Flex align="center" gap={4}>
                        <Text fontSize="sm" color={mutedTextColor}>
                          {format(new Date(assignment.dueDate), 'MMM d, yyyy')} – {getDaysLeftText(new Date(assignment.dueDate))}
                        </Text>
                        <IconButton
                          aria-label="Edit assignment"
                          icon={<EditIcon />}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(assignment.id)}
                        />
                        <IconButton
                          aria-label="Delete assignment"
                          icon={<DeleteIcon />}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(assignment.id)}
                          colorScheme="red"
                        />
                      </Flex>
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          </Box>
        ))}
        {filteredAssignments.length === 0 && (
          <Text color={textColor} textAlign="center" py={8}>
            No assignments found
          </Text>
        )}
      </VStack>

      <EditAssignmentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAssignmentId(null);
        }}
        assignmentId={selectedAssignmentId}
      />

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg={bgColor}>
            <AlertDialogHeader color={textColor}>Delete Assignment</AlertDialogHeader>
            <AlertDialogBody color={textColor}>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose} color={textColor}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
