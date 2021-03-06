﻿using Microsoft.Xna.Framework;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using ProtoBuf;

namespace WebGame
{
    public enum MissionType
    {
        MISSION_TYPE_GO_TO_LOCATION,
        MISSION_TYPE_DEFEAT_ENEMY
    }

    public abstract class Mission
    {
        public MissionType Type { get; set; }

        public string Text { get; set; }
        
        public Mission(MissionType initType, string initMissionText)
        {
            Type = initType;
            Text = initMissionText;
        }

        //public void Update(TimeSpan elapsed);  // may make these entities or something later so that we can have timed missions

        internal abstract bool IsComplete();

        internal abstract void MissionSetup();
    }
}