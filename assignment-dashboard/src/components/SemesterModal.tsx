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
  FormHelperText,
  Input,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { v4 as uuidv4 } from 'uuid';
import useStore from '@/store/useStore';

interface SemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSemesterCreated?: (semesterId: string) => void;
}

export function SemesterModal({ isOpen, onClose, onSemesterCreated }: SemesterModalProps) {
  const [newSemesterName, setNewSemesterName] = useState('');
  const [newSemesterStartDate, setNewSemesterStartDate] = useState('');
  const [newSemesterEndDate, setNewSemesterEndDate] = useState('');
  const { addSemester } = useStore();
  const toast = useToast();

  // Dark mode colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const inputBg = useColorModeValue('white', 'whiteAlpha.200');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const labelColor = useColorModeValue('gray.700', 'whiteAlpha.800');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.400');

  const handleCreateSemester = () => {
    if (!newSemesterName.trim()) return;

    const newSemester = {
      id: uuidv4(),
      name: newSemesterName.trim(),
      ...(newSemesterStartDate && { startDate: newSemesterStartDate }),
      ...(newSemesterEndDate && { endDate: newSemesterEndDate }),
    };

    addSemester(newSemester);
    onSemesterCreated?.(newSemester.id);
    setNewSemesterName('');
    setNewSemesterStartDate('');
    setNewSemesterEndDate('');
    onClose();

    toast({
      title: 'Semester created',
      description: `Successfully created ${newSemesterName}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader color={textColor}>Create New Semester</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel color={textColor}>Semester Name</FormLabel>
              <Input
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                placeholder="e.g., Fall 2024"
                bg={inputBg}
                borderColor={borderColor}
                color={textColor}
                _placeholder={{ color: placeholderColor }}
              />
            </FormControl>
            <FormControl>
              <FormLabel color={textColor}>Start Date (Optional)</FormLabel>
              <Input
                type="date"
                value={newSemesterStartDate}
                onChange={(e) => setNewSemesterStartDate(e.target.value)}
                bg={inputBg}
                borderColor={borderColor}
                color={textColor}
              />
              <FormHelperText color={labelColor}>
                If set, this will appear as an event in your calendar
              </FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel color={textColor}>End Date (Optional)</FormLabel>
              <Input
                type="date"
                value={newSemesterEndDate}
                onChange={(e) => setNewSemesterEndDate(e.target.value)}
                min={newSemesterStartDate}
                bg={inputBg}
                borderColor={borderColor}
                color={textColor}
              />
              <FormHelperText color={labelColor}>
                If set, this will appear as an event in your calendar
              </FormHelperText>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} color={textColor}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleCreateSemester}
            isDisabled={!newSemesterName.trim()}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
