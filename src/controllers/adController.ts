
import { Response } from 'express';
import prisma from '../db';
import { type AuthRequest } from '../middleware/auth';
import { type GeneratedAdData } from '../types';

export const getAllAds = async (req: AuthRequest, res: Response) => {
  try {
    const ads = await prisma.ad.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    res.status(200).json(ads);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ads' });
  }
};

export const createAd = async (req: AuthRequest, res: Response) => {
  const { adData, imageUrls }: { adData: GeneratedAdData, imageUrls: string[] } = req.body;
  const sellerId = req.user?.id;

  if (!sellerId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const newAd = await prisma.ad.create({
      data: {
        title: adData.title,
        description: adData.description,
        price: adData.price,
        category: adData.category,
        location: adData.location,
        tags: adData.tags,
        imageUrls: imageUrls,
        sellerId: sellerId,
        // Default status for new ads
        status: 'active',
      },
       include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
    res.status(201).json(newAd);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create ad' });
  }
};
