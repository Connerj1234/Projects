'use client';

import { useState } from 'react';
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  FormHelperText,
  useToast,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import useStore from '@/store/useStore';

type NewAssignmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function NewAssignmentModal({ isOpen, onClose }: NewAssignmentModalProps) {
  const { classes, assignmentTypes, semesters, addAssignment } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [semester, setSemester] = useState('');
  const [isBulkCreate, setIsBulkCreate] = useState(false);
  const [numberOfAssignments, setNumberOfAssignments] = useState(1);
  const toast = useToast();

  const handleSubmit = () => {
    try {
      const baseAssignment = {
        title,
        description,
        classId,
        type: assignmentTypes.find(t => t.id === typeId)!,
        semester,
        completed: false,
      };

      if (isBulkCreate) {
        // Create multiple assignments with incrementing numbers
        for (let i = 1; i <= numberOfAssignments; i++) {
          const assignmentNumber = i.toString().padStart(2, '0');
          addAssignment({
            ...baseAssignment,
            id: `${Date.now()}-${i}`,
            title: `${title} ${assignmentNumber}`,
            dueDate: new Date(dueDate),
          });
        }
        toast({
          title: 'Assignments created',
          description: `Successfully created ${numberOfAssignments} assignments`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create single assignment
        addAssignment({
          ...baseAssignment,
          id: Date.now().toString(),
          dueDate: new Date(dueDate),
        });
        toast({
          title: 'Assignment created',
          description: 'Successfully created the assignment',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setClassId('');
      setTypeId('');
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setSemester('');
      setIsBulkCreate(false);
      setNumberOfAssignments(1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create assignment(s)',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Assignment</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter assignment title"
              />
              {isBulkCreate && (
                <FormHelperText>
                  Numbers will be automatically appended (e.g., "Homework 01", "Homework 02")
                </FormHelperText>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter assignment description"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Class</FormLabel>
              <Select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                placeholder="Select class"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Type</FormLabel>
              <Select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                placeholder="Select type"
              >
                {assignmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Due Date</FormLabel>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Semester</FormLabel>
              <Select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Select semester"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Create Multiple Assignments</FormLabel>
              <Switch
                isChecked={isBulkCreate}
                onChange={(e) => setIsBulkCreate(e.target.checked)}
              />
            </FormControl>

            {isBulkCreate && (
              <FormControl>
                <FormLabel>Number of Assignments</FormLabel>
                <NumberInput
                  value={numberOfAssignments}
                  onChange={(_, value) => setNumberOfAssignments(value)}
                  min={1}
                  max={20}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isDisabled={!title || !classId || !typeId || !dueDate || !semester}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
