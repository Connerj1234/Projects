'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  useToast,
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import useStore from '@/store/useStore';

type EditAssignmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string | null;
};

export function EditAssignmentModal({ isOpen, onClose, assignmentId }: EditAssignmentModalProps) {
  const {
    assignments,
    classes,
    assignmentTypes,
    semesters,
    updateAssignment,
    deleteAssignment,
    addAssignment,
  } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [semester, setSemester] = useState('');
  const [completed, setCompleted] = useState(false);

  const toast = useToast();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // Dark mode colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const inputBg = useColorModeValue('white', 'whiteAlpha.200');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.400');
  const labelColor = useColorModeValue('gray.700', 'whiteAlpha.800');

  // Get classes for selected semester
  const semesterClasses = classes.filter(c => c.semesterId === semester);

  // Load assignment data when modal opens
  useEffect(() => {
    if (assignmentId) {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment) {
        setTitle(assignment.title);
        setDescription(assignment.description || '');
        setClassId(assignment.classId);
        setTypeId(assignment.type.id);
        setDueDate(format(new Date(assignment.dueDate), 'yyyy-MM-dd'));
        setSemester(assignment.semester);
        setCompleted(assignment.completed);
      }
    }
  }, [assignmentId, assignments]);

  const handleUpdate = () => {
    if (!assignmentId) return;

    try {
      updateAssignment(assignmentId, {
        title,
        description,
        classId,
        type: assignmentTypes.find(t => t.id === typeId)!,
        semester,
        dueDate: new Date(dueDate + 'T12:00:00').toISOString(),
        completed,
      });

      toast({
        title: 'Assignment updated',
        description: 'Successfully updated the assignment',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update assignment',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDelete = () => {
    if (!assignmentId) return;

    try {
      deleteAssignment(assignmentId);
      toast({
        title: 'Assignment deleted',
        description: 'Successfully deleted the assignment',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
      onClose();
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

  const handleDuplicate = () => {
    try {
      addAssignment({
        id: Date.now().toString(),
        title: `${title} (Copy)`,
        description,
        classId,
        type: assignmentTypes.find(t => t.id === typeId)!,
        semester,
        dueDate: new Date(dueDate + 'T12:00:00').toISOString(),
        completed: false,
      });

      toast({
        title: 'Assignment duplicated',
        description: 'Successfully duplicated the assignment',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate assignment',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>Edit Assignment</ModalHeader>
          <ModalCloseButton color={textColor} />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color={labelColor}>Semester</FormLabel>
                <Select
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value);
                    setClassId(''); // Reset class selection when semester changes
                  }}
                  placeholder="Select semester"
                  bg={inputBg}
                  borderColor={borderColor}
                  color={textColor}
                  _placeholder={{ color: placeholderColor }}
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color={labelColor}>Title</FormLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter assignment title"
                  bg={inputBg}
                  borderColor={borderColor}
                  color={textColor}
                  _placeholder={{ color: placeholderColor }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color={labelColor}>Description</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter assignment description"
                  bg={inputBg}
                  borderColor={borderColor}
                  color={textColor}
                  _placeholder={{ color: placeholderColor }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color={labelColor}>Class</FormLabel>
                <Select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  placeholder="Select class"
                  bg={inputBg}
                  borderColor={borderColor}
                  color={textColor}
                  _placeholder={{ color: placeholderColor }}
                >
                  {semesterClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color={labelColor}>Type</FormLabel>
                <Select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  placeholder="Select type"
                  bg={inputBg}
                  borderColor={borderColor}
                  color={textColor}
                  _placeholder={{ color: placeholderColor }}
                >
                  {assignmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color={labelColor}>Due Date</FormLabel>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value + 'T12:00:00')}
                  bg={inputBg}
                  borderColor={borderColor}
                  color={textColor}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0" color={labelColor}>Completed</FormLabel>
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  style={{ marginLeft: '8px' }}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleDuplicate} color={textColor}>
              Duplicate
            </Button>
            <Button variant="ghost" mr={3} onClick={onClose} color={textColor}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleUpdate}
              isDisabled={!title.trim() || !classId || !typeId || !semester}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose} leastDestructiveRef={null}>
        <AlertDialogOverlay>
          <AlertDialogContent bg={bgColor}>
            <AlertDialogHeader color={textColor}>Delete Assignment</AlertDialogHeader>
            <AlertDialogBody color={textColor}>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onDeleteClose} color={textColor}>Cancel</Button>
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
