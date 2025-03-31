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
  FormHelperText,
  Input,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import useStore from '@/store/useStore';

interface EditSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: string;
}

export function EditSemesterModal({ isOpen, onClose, semesterId }: EditSemesterModalProps) {
  const [semesterName, setSemesterName] = useState('');
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [semesterEndDate, setSemesterEndDate] = useState('');
  const { semesters, updateSemester } = useStore();
  const toast = useToast();

  // Dark mode colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const inputBg = useColorModeValue('white', 'whiteAlpha.200');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const labelColor = useColorModeValue('gray.700', 'whiteAlpha.800');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.400');

  // Load semester data when modal opens
  useEffect(() => {
    const semester = semesters.find(s => s.id === semesterId);
    if (semester) {
      setSemesterName(semester.name);
      setSemesterStartDate(semester.startDate || '');
      setSemesterEndDate(semester.endDate || '');
    }
  }, [semesterId, semesters]);

  const handleUpdateSemester = () => {
    if (!semesterName.trim() || !semesterEndDate) {
      toast({
        title: 'Required fields missing',
        description: 'Please provide both a semester name and end date',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const updates = {
      name: semesterName.trim(),
      ...(semesterStartDate && { startDate: semesterStartDate }),
      endDate: semesterEndDate,
    };

    updateSemester(semesterId, updates);
    onClose();

    toast({
      title: 'Semester updated',
      description: `Successfully updated ${semesterName}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader color={textColor}>Edit Semester</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel color={textColor}>Semester Name</FormLabel>
              <Input
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
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
                value={semesterStartDate}
                onChange={(e) => setSemesterStartDate(e.target.value)}
                bg={inputBg}
                borderColor={borderColor}
                color={textColor}
              />
              <FormHelperText color={labelColor}>
                If set, this will appear as an event in your calendar
              </FormHelperText>
            </FormControl>
            <FormControl isRequired>
              <FormLabel color={textColor}>End Date</FormLabel>
              <Input
                type="date"
                value={semesterEndDate}
                onChange={(e) => setSemesterEndDate(e.target.value)}
                min={semesterStartDate}
                bg={inputBg}
                borderColor={borderColor}
                color={textColor}
              />
              <FormHelperText color={labelColor}>
                This will appear as an event in your calendar
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
            onClick={handleUpdateSemester}
            isDisabled={!semesterName.trim()}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
