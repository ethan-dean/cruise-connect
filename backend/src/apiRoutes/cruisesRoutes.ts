import express from 'express';

import { respondIf } from '../utils/respondIf.js';
import { authenticateToken } from '../utils/tokenUtils.js';
import { getCompaniesData, getCompanyDataById,
          getShipsDataByCompany, getShipDataById, 
          addCruise, getCruiseByDateAndShip, getCruiseById,
          addJoinedCruise, deleteJoinedCruise, getJoinedCruisesByUser, getJoinedCruisesByCruise,
          getUserProfilesFromIds
        } from '../database.js'


// TODO: Improve robustness of these endpoints (find breaking issues)
// TODO: Use respondIf consistently
///////////////////////////////////////////////////////////////////////////////////////////
// Initialize server app.
const cruisesRouter = express.Router();

///////////////////////////////////////////////////////////////////////////////////////////
// Get all company data endpoint.
cruisesRouter.post('/get-companies', authenticateToken, async (req: any, res: any) => {
  const [getCompaniesErr, companies] = await getCompaniesData();
  if (respondIf(!!getCompaniesErr, res, 500, 'Server error, try again later...', 'Failed getCompaniesData ' + getCompaniesErr)) return;

  res.status(200).json(companies);
});

///////////////////////////////////////////////////////////////////////////////////////////
// Get ship data for a specific company endpoint.
cruisesRouter.post('/get-ships-of-company', authenticateToken, async (req: any, res: any) => {
  const { companyId } = req.body;
  if (respondIf(!companyId, res, 400, 'Server error, try again later...', 'Invalid input: companyId is required.' )) return;

  const [getShipsErr, ships] = await getShipsDataByCompany(companyId);
  if (respondIf(!!getShipsErr, res, 500, 'Server error, try again later...', 'Failed getShipsDataByCompany ' + getShipsErr)) return;

  res.status(200).json(ships);
});

///////////////////////////////////////////////////////////////////////////////////////////
// Add a user to a cruise.
cruisesRouter.post('/join-cruise', authenticateToken, async (req: any, res: any) => {
  const userId: number = req.token.userId;
  const { cruiseDepartureDate, shipId } = req.body;
  if (respondIf(!cruiseDepartureDate || !shipId, res, 400, 'Server error, try again later...', 'Invalid input: cruiseDepartureDate and shipId are required.')) return;

  const [getCruiseErr, cruiseId] = await getCruiseByDateAndShip(cruiseDepartureDate, shipId);
  if (respondIf(!!getCruiseErr, res, 500, 'Server error, try again later...', 'Failed getCruiseByDateAndShip ' + getCruiseErr)) return;

  let cruiseIdFinal = cruiseId;
  if (!cruiseIdFinal) {
    const [addCruiseErr, addCruiseResult] = await addCruise(cruiseDepartureDate, shipId);
    if (respondIf(!!addCruiseErr, res, 500, 'Server error, try again later...', 'Failed addCruise ' + addCruiseErr)) return;
    cruiseIdFinal = addCruiseResult.cruiseId;
  }

  const [addJoinedErr] = await addJoinedCruise(userId, cruiseIdFinal);
  if (respondIf(!!addJoinedErr, res, 500, 'Server error, try again later...', 'Failed addJoinedCruise ' + addJoinedErr)) return;

  res.status(200).json({ success: true, message: 'User successfully joined the cruise.' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Remove a user from a cruise.
cruisesRouter.post('/leave-cruise', authenticateToken, async (req: any, res: any) => {
  const userId: number = req.token.userId;
  const { cruiseId } = req.body;
  if (!cruiseId) return res.status(400).json({ error: 'Invalid input: cruiseId is required.' });

  const [deleteJoinedErr] = await deleteJoinedCruise(userId, cruiseId);
  if (respondIf(!!deleteJoinedErr, res, 500, 'Server error, try again later...', 'Failed deleteJoinedCruise ' + deleteJoinedErr)) return;

  res.status(200).json({ success: true, message: 'User successfully left the cruise.' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Get users cruises they have joined.
cruisesRouter.post('/get-my-cruises', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.token.userId; // Extract user ID from the authenticated token
        const [ _err, joinedCruises ] = await getJoinedCruisesByUser(userId); // Get cruise IDs

        if (!joinedCruises || joinedCruises.length === 0) {
            return res.json([]); // Return an empty array if the user has joined no cruises
        }

        // Fetch cruise details including departureDate and shipName
        const cruiseDetails = await Promise.all(joinedCruises.map(async (cruiseId: number) => {
            const [_getCruiseErr, cruise] = await getCruiseById(cruiseId);
            if (!cruise) return null;

            const [_getShipErr, ship] = await getShipDataById(cruise.shipId);
            return {
                cruiseId,
                departureDate: cruise.cruiseDepartureDate,
                shipName: ship ? ship.shipName : "Unknown Ship"
            };
        }));

        // Filter out any null values (in case a cruise or ship wasn't found)
        res.json(cruiseDetails.filter(c => c !== null));
    } catch (error) {
        console.error("Error fetching user cruises:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

///////////////////////////////////////////////////////////////////////////////////////////
// Get user profiles data endpoint.
// TODO: Make this send data in groups
cruisesRouter.post('/get-cruise-feed', authenticateToken, async (req: any, res: any) => {
  const cruiseId: number = req.body.cruiseId;

  if (!cruiseId) {
    return res.status(400).json({ error: 'Invalid input: cruiseId is required.' });
  }

  // Get userIds for the given cruiseId.
  const [getUsersErr, userIds] = await getJoinedCruisesByCruise(cruiseId);
  if (respondIf(!!getUsersErr, res, 500, 'Server error, try again later...', 'Failed getJoinedCruisesByCruise ' + getUsersErr)) return;
 
  // Return an empty array if no other users are found.
  if (userIds.filter(id => id !== req.token.userId).length === 0) {
    return res.status(200).json([]);
  }

  // Get user profiles based on userIds.
  const [getProfilesErr, userProfiles] = await getUserProfilesFromIds(userIds.filter(id => id !== req.token.userId));
  if (respondIf(!!getProfilesErr, res, 500, 'Server error, try again later...', 'Failed getUserProfilesFromIds ' + getProfilesErr)) return;

  res.status(200).json(userProfiles);
});

///////////////////////////////////////////////////////////////////////////////////////////
// Export for 'cruisesRoutes.ts'.
export default cruisesRouter;
