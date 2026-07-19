"""
test_face_system.py
Automated test suite for CV API modules.
"""

import sys
import unittest
import numpy as np
import cv2
from pathlib import Path

# Add cv-api root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from services.face_detector import detect_faces_dnn, detect_faces, get_face_landmarks
from services.face_embedder import generate_embedding, compute_embedding_quality
from services.liveness_detector import simple_liveness_check
from services.face_recognizer import _cosine_similarity, recognize_face, load_all_embeddings
from services.dataset_generator import preprocess_images


class TestFaceRecognitionSystem(unittest.TestCase):

    def setUp(self):
        # Create a synthetic face image (black background with a drawn circle representing a face)
        self.synthetic_img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Draw face skin-tone circle
        cv2.circle(self.synthetic_img, (320, 240), 100, (180, 200, 230), -1)
        # Draw eyes
        cv2.circle(self.synthetic_img, (280, 210), 15, (50, 50, 50), -1)
        cv2.circle(self.synthetic_img, (360, 210), 15, (50, 50, 50), -1)
        # Draw mouth
        cv2.ellipse(self.synthetic_img, (320, 270), (40, 15), 0, 0, 180, (50, 50, 50), 3)

    def test_detector_runs_without_crash(self):
        bboxes = detect_faces_dnn(self.synthetic_img)
        self.assertIsInstance(bboxes, list)

    def test_haar_detector_runs(self):
        bboxes = detect_faces(self.synthetic_img)
        self.assertIsInstance(bboxes, list)

    def test_simple_liveness_check(self):
        res = simple_liveness_check(self.synthetic_img)
        self.assertIn("is_live", res)
        self.assertIn("confidence", res)

    def test_cosine_similarity(self):
        v1 = np.random.randn(128).astype(np.float32)
        v1 /= np.linalg.norm(v1)
        # Self-similarity must be ~ 1.0
        sim = _cosine_similarity(v1, v1)
        self.assertAlmostEqual(sim, 1.0, places=4)

    def test_compute_embedding_quality(self):
        v1 = np.random.randn(128).astype(np.float32)
        v1 /= np.linalg.norm(v1)
        score = compute_embedding_quality(v1)
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)


if __name__ == "__main__":
    unittest.main()
