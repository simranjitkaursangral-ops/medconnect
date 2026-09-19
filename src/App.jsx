import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Header from "./component/common/Header";
import Footer from "./component/common/Footer";

import Home from "./component/home/Home";

import MedicineSearch from "./component/medicine/MedicineSearch";
import MedicineResults from "./component/medicine/MedicineResults";
import PharmacyDetails from "./component/medicine/PharmacyDetails";

import RequestMedicine from "./component/request/RequestMedicine";
import MyRequests from "./component/request/MyRequests";
import PrescriptionUpload from "./component/request/PrescriptionUpload";
import MyPrescriptions from "./component/request/MyPrescriptions";

import Login from "./component/auth/Login";
import Register from "./component/auth/Register";
import Profile from "./component/auth/Profile";
import ProtectedRoute from "./component/auth/ProtectedRoute";

import PharmacyRegister from "./component/pharmacy/PharmacyRegister";
import PharmacyDashboard from "./component/pharmacy/PharmacyDashboard";
import PharmacyProfile from "./component/pharmacy/PharmacyProfile";
import MedicineList from "./component/pharmacy/MedicineList";
import AddMedicine from "./component/pharmacy/AddMedicine";
import UpdateStock from "./component/pharmacy/UpdateStock";
import MedicineRequests from "./component/pharmacy/MedicineRequests";
import Prescriptions from "./component/pharmacy/Prescriptions";

import AdminDashboard from "./component/admin/AdminDashboard";
import PharmacyApplications from "./component/admin/PharmacyApplications";
import Pharmacies from "./component/admin/Pharmacies";
import Users from "./component/admin/Users";

function App() {
  return (
    <BrowserRouter>

      <Header />

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/search"
          element={<MedicineSearch />}
        />

        <Route
          path="/results"
          element={<MedicineResults />}
        />

        <Route
          path="/pharmacy/:pharmacyId"
          element={<PharmacyDetails />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/pharmacy-register"
          element={<PharmacyRegister />}
        />

        <Route
          element={
            <ProtectedRoute
              allowedRole="user"
            />
          }
        >

          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/request-medicine"
            element={<RequestMedicine />}
          />

          <Route
            path="/my-requests"
            element={<MyRequests />}
          />

          <Route
            path="/prescription-upload"
            element={<PrescriptionUpload />}
          />

          <Route
            path="/my-prescriptions"
            element={<MyPrescriptions />}
          />

        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedRole="pharmacy"
            />
          }
        >

          <Route
            path="/pharmacy-dashboard"
            element={<PharmacyDashboard />}
          />

          <Route
            path="/pharmacy-profile"
            element={<PharmacyProfile />}
          />

          <Route
            path="/pharmacy-medicines"
            element={<MedicineList />}
          />

          <Route
            path="/pharmacy-add-medicine"
            element={<AddMedicine />}
          />

          <Route
            path="/pharmacy-update-stock/:id"
            element={<UpdateStock />}
          />

          <Route
            path="/pharmacy-requests"
            element={<MedicineRequests />}
          />

          <Route
            path="/pharmacy-prescriptions"
            element={<Prescriptions />}
          />

        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedRole="admin"
            />
          }
        >

          <Route
            path="/admin-dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin-pharmacy-applications"
            element={
              <PharmacyApplications />
            }
          />

          <Route
            path="/admin-pharmacies"
            element={<Pharmacies />}
          />

          <Route
            path="/admin-users"
            element={<Users />}
          />

        </Route>

        <Route
          path="*"
          element={<Home />}
        />

      </Routes>

      <Footer />

    </BrowserRouter>
  );
}

export default App;