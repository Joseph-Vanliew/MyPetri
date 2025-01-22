import axios from 'axios';

const API_URL = 'http://localhost:8080/api/petrinet';

export const processPetriNet = async (petriNetDTO) => {
    try {
        const response = await axios.post(API_URL, petriNetDTO);
        return response.data;
    } catch (error) {
        console.error('Error processing Petri net:', error);
        throw error;
    }
};